package org.jamealtafasir.mobile.core.text

import org.junit.Assert.assertEquals
import org.junit.Test

class ArabicTextNormalizerTest {
    @Test
    fun removesQuranicMarksWithoutChangingDisplayText() {
        val original = "الرَّحْمَٰنِ"

        assertEquals("الرحمن", ArabicTextNormalizer.normalizeForSearch(original))
        assertEquals("الرَّحْمَٰنِ", original)
    }

    @Test
    fun findsBismillahWithoutDiacritics() {
        assertEquals("بسم", ArabicTextNormalizer.normalizeForSearch("بِسْمِ"))
    }

    @Test
    fun normalizesAlefWaslaAndAllahMarks() {
        assertEquals("الله", ArabicTextNormalizer.normalizeForSearch("ٱللَّهِ"))
    }

    @Test
    fun unifiesPersianArabicLettersAndDigits() {
        assertEquals(
            "ایه 255 کتاب رحمه",
            ArabicTextNormalizer.normalizeForSearch("آيَة ۲٥٥ كِتاب رَحْمَة"),
        )
    }

    @Test
    fun removesJoinersTatweelAndExtraWhitespace() {
        assertEquals(
            "میخواهم بسم الله",
            ArabicTextNormalizer.normalizeForSearch("  می‌خواهم   بِسْـمِ  اللّٰهِ "),
        )
    }
}
