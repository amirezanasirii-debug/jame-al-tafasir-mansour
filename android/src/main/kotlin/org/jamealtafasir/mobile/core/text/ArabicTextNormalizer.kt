package org.jamealtafasir.mobile.core.text

import java.text.Normalizer
import java.util.Locale

/**
 * Produces a search-only representation of Persian and Arabic text.
 * The original display text must always be stored separately and unchanged.
 */
object ArabicTextNormalizer {
    private val collapsibleWhitespace = Regex("[\\s\\u00A0]+")

    fun normalizeForSearch(value: CharSequence?): String {
        if (value.isNullOrEmpty()) return ""

        val decomposed = Normalizer.normalize(value, Normalizer.Form.NFD)
        val output = StringBuilder(decomposed.length)
        var index = 0
        while (index < decomposed.length) {
            val codePoint = Character.codePointAt(decomposed, index)
            index += Character.charCount(codePoint)

            if (shouldRemove(codePoint)) continue
            output.appendCodePoint(normalizeCodePoint(codePoint))
        }

        return collapsibleWhitespace
            .replace(output.toString(), " ")
            .trim()
            .lowercase(Locale.ROOT)
    }

    fun compactForSearch(value: CharSequence?): String =
        normalizeForSearch(value).replace(" ", "")

    private fun shouldRemove(codePoint: Int): Boolean {
        val type = Character.getType(codePoint)
        return type == Character.NON_SPACING_MARK.toInt() ||
            type == Character.COMBINING_SPACING_MARK.toInt() ||
            type == Character.ENCLOSING_MARK.toInt() ||
            codePoint == 0x0640 ||
            codePoint in 0x06D6..0x06ED ||
            codePoint in 0x200B..0x200F ||
            codePoint == 0x2060 ||
            codePoint == 0xFEFF
    }

    private fun normalizeCodePoint(codePoint: Int): Int = when (codePoint) {
        in 0x0660..0x0669 -> '0'.code + (codePoint - 0x0660)
        in 0x06F0..0x06F9 -> '0'.code + (codePoint - 0x06F0)
        0x0622, 0x0623, 0x0625, 0x0671 -> 0x0627
        0x064A, 0x0649, 0x0626 -> 0x06CC
        0x0643 -> 0x06A9
        0x0629, 0x06C0 -> 0x0647
        0x0624 -> 0x0648
        else -> codePoint
    }
}
