package org.jamealtafasir.mobile.core.search

import org.jamealtafasir.mobile.core.text.ArabicTextNormalizer

object FtsQuerySanitizer {
    private const val MAX_QUERY_LENGTH = 256
    private const val MAX_TERMS = 16
    private val termPattern = Regex("[\\p{L}\\p{N}]+")

    fun buildMatchQuery(
        rawQuery: CharSequence?,
        exactPhrase: Boolean = false,
        prefix: Boolean = true,
    ): String {
        val normalized = ArabicTextNormalizer
            .normalizeForSearch(rawQuery)
            .take(MAX_QUERY_LENGTH)
        val terms = termPattern.findAll(normalized)
            .map { it.value }
            .filter { it.isNotBlank() }
            .take(MAX_TERMS)
            .toList()
        if (terms.isEmpty()) return ""

        if (exactPhrase) return terms.joinToString(" ", prefix = "\"", postfix = "\"")
        return terms.joinToString(" ") { term -> if (prefix) "$term*" else term }
    }
}
