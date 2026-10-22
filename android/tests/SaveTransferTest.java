package de.sternenbaby.app;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

public final class SaveTransferTest {
    private static int passed;
    private interface Checked { void run() throws Exception; }
    private static void expectError(Checked test) throws Exception {
        try { test.run(); throw new AssertionError("Expected rejected document"); }
        catch (IOException expected) { passed++; }
    }
    public static void main(String[] args) throws Exception {
        String json = "{\"babyName\":\"Mäuschen 🌟\"}";
        String result = SaveTransfer.read(new ByteArrayInputStream(SaveTransfer.encode(json)));
        if (!json.equals(result)) throw new AssertionError("UTF-8 roundtrip");
        passed++;
        if (!json.equals(SaveTransfer.read(new ByteArrayInputStream(("\uFEFF" + json).getBytes(StandardCharsets.UTF_8))))) throw new AssertionError("BOM handling");
        passed++;
        byte[] exact = new byte[SaveTransfer.MAX_BYTES];
        Arrays.fill(exact, (byte) 'x');
        if (SaveTransfer.read(new ByteArrayInputStream(exact)).length() != exact.length) throw new AssertionError("Exact limit");
        passed++;
        expectError(() -> SaveTransfer.read(new ByteArrayInputStream(new byte[SaveTransfer.MAX_BYTES + 1])));
        expectError(() -> SaveTransfer.read(new ByteArrayInputStream(new byte[0])));
        expectError(() -> SaveTransfer.read(null));
        expectError(() -> SaveTransfer.read(new ByteArrayInputStream(new byte[]{(byte) 0xc3, 0x28})));
        expectError(() -> SaveTransfer.read(new ByteArrayInputStream(new byte[]{(byte) 0xf0, (byte) 0x9f})));
        expectError(() -> SaveTransfer.encode(""));
        expectError(() -> SaveTransfer.encode(null));
        char[] large = new char[SaveTransfer.MAX_BYTES / 2 + 1];
        Arrays.fill(large, 'ü');
        expectError(() -> SaveTransfer.encode(new String(large)));
        System.out.println("SaveTransfer: " + passed + " UTF-8, empty, size and binary checks passed.");
    }
}
