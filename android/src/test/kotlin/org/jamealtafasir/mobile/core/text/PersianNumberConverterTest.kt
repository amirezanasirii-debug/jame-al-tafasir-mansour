package org.jamealtafasir.mobile.core.text

import org.junit.Assert.assertEquals
import org.junit.Test

class PersianNumberConverterTest {
    @Test
    fun convertsAsciiAndArabicIndicDigitsToPersian() {
        assertEquals("آیه ۲۵۵ از ۲۸۶", PersianNumberConverter.toPersianDigits("آیه 255 از ٢٨٦"))
    }

    @Test
    fun convertsPersianAndArabicIndicDigitsToAscii() {
        assertEquals("2:255", PersianNumberConverter.toAsciiDigits("۲:٢٥٥"))
    }

    @Test
    fun handlesNullWithoutPlaceholderText() {
        assertEquals("", PersianNumberConverter.toPersianDigits(null))
        assertEquals("", PersianNumberConverter.toAsciiDigits(null))
    }
}
