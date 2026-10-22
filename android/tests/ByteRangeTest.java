package de.sternenbaby.app;

/** Pure JVM checks for the byte ranges used by local WebView media responses. */
public final class ByteRangeTest {
    private static void expectRange(String value, long total, long start, long end) {
        ByteRange range = ByteRange.parse(value, total);
        if (range == null || range.start != start || range.end != end || range.length() != end - start + 1) {
            throw new AssertionError("Unexpected result for " + value + " with length " + total);
        }
    }

    private static void expectInvalid(String value, long total) {
        if (ByteRange.parse(value, total) != null) {
            throw new AssertionError("Range should have been rejected: " + value);
        }
    }

    public static void main(String[] args) {
        expectRange("bytes=0-499", 1000, 0, 499);
        expectRange("bytes=500-", 1000, 500, 999);
        expectRange("bytes=-250", 1000, 750, 999);
        expectRange("bytes=-2000", 1000, 0, 999);
        expectRange("bytes=0-2000", 1000, 0, 999);
        expectInvalid("bytes=1000-", 1000);
        expectInvalid("bytes=5-4", 1000);
        expectInvalid("bytes=0-1,4-6", 1000);
        expectInvalid("bytes=0-", 0);
        expectInvalid("bytes=-", 1000);
        expectInvalid("bytes=-0", 1000);
        expectInvalid("bytes=999999999999999999999-", 1000);
        System.out.println("12 media byte-range boundary cases passed");
    }
}
