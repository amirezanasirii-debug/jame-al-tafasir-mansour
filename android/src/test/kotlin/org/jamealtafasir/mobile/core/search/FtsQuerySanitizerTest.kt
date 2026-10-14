package org.jamealtafasir.mobile.core.search

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class FtsQuerySanitizerTest {
    @Test
    fun stripsFtsOperatorsAndBuildsControlledPrefixes() {
        val query = FtsQuerySanitizer.buildMatchQuery("الله\" OR DROP TABLE notes; --")

        assertEquals("الله* or* drop* table* notes*", query)
        assertFalse(query.contains(';'))
        assertFalse(query.contains('"'))
    }

    @Test
    fun normalizesQuranicMarksBeforeSearch() {
        assertEquals("الله*", FtsQuerySanitizer.buildMatchQuery("ٱللَّهِ"))
        assertEquals("الرحمن*", FtsQuerySanitizer.buildMatchQuery("الرَّحْمَٰنِ"))
    }

    @Test
    fun createsPhraseOnlyFromSafeTerms() {
        assertEquals(
            "\"بسم الله الرحمن\"",
            FtsQuerySanitizer.buildMatchQuery("بِسْمِ اللَّهِ الرَّحْمَٰنِ", exactPhrase = true),
        )
    }

    @Test
    fun returnsEmptyQueryForPunctuationOnlyInput() {
        assertEquals("", FtsQuerySanitizer.buildMatchQuery("\" ; -- ***"))
    }
}
