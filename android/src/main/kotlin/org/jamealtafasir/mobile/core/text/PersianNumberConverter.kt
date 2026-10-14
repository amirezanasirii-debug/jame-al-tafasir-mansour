package org.jamealtafasir.mobile.core.text

object PersianNumberConverter {
    private const val PERSIAN_ZERO = 0x06F0
    private const val ARABIC_ZERO = 0x0660

    fun toPersianDigits(value: Any?): String = buildString {
        value?.toString().orEmpty().forEach { character ->
            append(
                when (character) {
                    in '0'..'9' -> (PERSIAN_ZERO + character.digitToInt()).toChar()
                    in '٠'..'٩' -> (PERSIAN_ZERO + character.code - ARABIC_ZERO).toChar()
                    else -> character
                },
            )
        }
    }

    fun toAsciiDigits(value: CharSequence?): String = buildString {
        value?.forEach { character ->
            append(
                when (character) {
                    in '۰'..'۹' -> ('0'.code + character.code - PERSIAN_ZERO).toChar()
                    in '٠'..'٩' -> ('0'.code + character.code - ARABIC_ZERO).toChar()
                    else -> character
                },
            )
        }
    }
}
