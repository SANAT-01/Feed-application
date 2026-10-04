#!/usr/bin/env python3
"""Shared minimal clients for the feed lab — Redis (RESP) and Postgres (wire v3,
trust auth), hand-rolled so the image needs no third-party packages."""
import os
import socket
import struct

PGHOST = os.environ.get("PGHOST", "pg")
PGUSER = os.environ.get("PGUSER", "app")
PGDATABASE = os.environ.get("PGDATABASE", "feedapp")
REDISHOST = os.environ.get("REDISHOST", "redis")


# ----------------------------- minimal Redis (RESP) -----------------------------
class Redis:
    """One persistent connection; the fan-out worker pays one round trip per
    follower write — which is exactly the cost the lab wants you to feel."""

    def __init__(self, host=None):
        self.host = host or REDISHOST
        self.sock = None
        self.f = None

    def _connect(self):
        self.sock = socket.create_connection((self.host, 6379), timeout=5)
        self.f = self.sock.makefile("rb")

    def cmd(self, *args):
        if self.sock is None:
            self._connect()
        try:
            payload = b"*%d\r\n" % len(args)
            for a in args:
                b = str(a).encode()
                payload += b"$%d\r\n%s\r\n" % (len(b), b)
            self.sock.sendall(payload)
            return self._read()
        except (OSError, RuntimeError):
            # one reconnect attempt on a dropped connection
            self.close()
            self._connect()
            payload = b"*%d\r\n" % len(args)
            for a in args:
                b = str(a).encode()
                payload += b"$%d\r\n%s\r\n" % (len(b), b)
            self.sock.sendall(payload)
            return self._read()

    def _read(self):
        line = self.f.readline()
        tag, rest = line[:1], line[1:].strip()
        if tag == b"+":
            return rest.decode()
        if tag == b"-":
            raise RuntimeError(rest.decode())
        if tag == b":":
            return int(rest)
        if tag == b"$":
            n = int(rest)
            if n == -1:
                return None
            data = self.f.read(n)
            self.f.read(2)
            return data.decode()
        if tag == b"*":
            n = int(rest)
            return None if n == -1 else [self._read() for _ in range(n)]
        return None

    def close(self):
        try:
            if self.sock:
                self.sock.close()
        except OSError:
            pass
        self.sock = None
        self.f = None


# ------------------- minimal Postgres (wire v3, trust auth) ---------------------
def _pg_read_msg(f):
    hdr = f.read(5)
    if len(hdr) < 5:
        return None, b""
    tag = hdr[:1]
    length = struct.unpack("!I", hdr[1:5])[0]
    return tag, f.read(length - 4)


def pg_query_rows(sql):
    """Run a simple query and return all rows as lists of text columns."""
    with socket.create_connection((PGHOST, 5432), timeout=10) as s:
        params = b"user\x00" + PGUSER.encode() + b"\x00database\x00" + PGDATABASE.encode() + b"\x00\x00"
        s.sendall(struct.pack("!II", len(params) + 8, 196608) + params)
        f = s.makefile("rb")
        while True:
            tag, _ = _pg_read_msg(f)
            if tag is None or tag == b"Z":
                break
        query = sql.encode() + b"\x00"
        s.sendall(b"Q" + struct.pack("!I", len(query) + 4) + query)
        rows = []
        while True:
            tag, body = _pg_read_msg(f)
            if tag is None:
                break
            if tag == b"D":  # DataRow
                ncols = struct.unpack("!H", body[:2])[0]
                off = 2
                row = []
                for _ in range(ncols):
                    ln = struct.unpack("!i", body[off:off + 4])[0]
                    off += 4
                    if ln == -1:
                        row.append(None)
                    else:
                        row.append(body[off:off + ln].decode())
                        off += ln
                rows.append(row)
            elif tag == b"Z":  # ReadyForQuery
                break
        return rows


def pg_query_scalar(sql):
    rows = pg_query_rows(sql)
    return rows[0][0] if rows and rows[0] else None


def sql_quote(text):
    return "'" + text.replace("'", "''") + "'"
