package de.sternenbaby.app;

/** A single HTTP bytes range. Multiple and unsatisfiable ranges are rejected. */
final class ByteRange {
    final long start;
    final long end;

    private ByteRange(long start, long end) { this.start = start; this.end = end; }

    long length() { return end - start + 1; }

    static ByteRange parse(String header, long totalLength) {
        if (header == null || totalLength <= 0 || !header.startsWith("bytes=")) return null;
        String value = header.substring(6).trim();
        if (value.indexOf(',') != -1) return null;
        int split = value.indexOf('-');
        if (split < 0 || split != value.lastIndexOf('-')) return null;
        String left = value.substring(0, split);
        String right = value.substring(split + 1);
        try {
            long start;
            long end;
            if (left.isEmpty()) {
                long suffix = Long.parseLong(right);
                if (suffix <= 0) return null;
                start = Math.max(0, totalLength - suffix);
                end = totalLength - 1;
            } else {
                start = Long.parseLong(left);
                end = right.isEmpty() ? totalLength - 1 : Math.min(Long.parseLong(right), totalLength - 1);
            }
            if (start < 0 || start >= totalLength || end < start) return null;
            return new ByteRange(start, end);
        } catch (NumberFormatException malformed) {
            return null;
        }
    }
}
