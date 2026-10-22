package de.sternenbaby.app;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;

/** Bounded UTF-8 transfers shared by the Android document picker and JVM tests. */
final class SaveTransfer {
    static final int MAX_BYTES = 1024 * 1024;

    private SaveTransfer() { }

    static byte[] encode(String json) throws IOException {
        if (json == null || json.isEmpty() || json.length() > MAX_BYTES) {
            throw new IOException("Die Sicherung ist leer oder zu groß.");
        }
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        if (bytes.length > MAX_BYTES) throw new IOException("Die Sicherung ist zu groß.");
        return bytes;
    }

    static String read(InputStream input) throws IOException {
        if (input == null) throw new IOException("Die Datei konnte nicht geöffnet werden.");
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int total = 0;
        int count;
        while ((count = input.read(buffer)) != -1) {
            total += count;
            if (total > MAX_BYTES) throw new IOException("Die Sicherungsdatei ist zu groß.");
            output.write(buffer, 0, count);
        }
        if (total == 0) throw new IOException("Die Sicherungsdatei ist leer.");
        try {
            String json = StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(output.toByteArray())).toString();
            return json.startsWith("\uFEFF") ? json.substring(1) : json;
        } catch (CharacterCodingException error) {
            throw new IOException("Die Datei ist kein lesbarer UTF-8-Spielstand.");
        }
    }
}
