'use client'

import React, { useState, useEffect } from 'react'
import { parsePhoneNumberFromString } from 'libphonenumber-js'

interface PhoneInputProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  label?: string
  className?: string
}

export function PhoneInput({
  value = '',
  onChange,
  placeholder = '+86 138 0013 8000',
  label,
  className = '',
}: PhoneInputProps) {
  const [inputValue, setInputValue] = useState(value)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    let formattedValue = rawValue
    
    if (rawValue) {
      // Try to parse as a phone number
      const phoneNumber = parsePhoneNumberFromString(rawValue, 'CN')
      
      if (phoneNumber && phoneNumber.isValid()) {
        // Format the phone number properly
        formattedValue = phoneNumber.formatInternational()
      } else if (rawValue.length > 0) {
        // If it starts with 1-9 and is 11 digits, assume Chinese number
        if (/^[1-9]\d{10,}$/.test(rawValue)) {
          const phone = parsePhoneNumberFromString(`+86${rawValue}`, 'CN')
          formattedValue = phone ? phone.formatInternational() : rawValue
        } else if (rawValue.startsWith('+86') || rawValue.startsWith('0086')) {
          const phone = parsePhoneNumberFromString(rawValue.replace('0086', '+86'), 'CN')
          formattedValue = phone ? phone.formatInternational() : rawValue
        } else {
          // Keep as is for other formats
          formattedValue = rawValue
        }
      }
    }
    
    setInputValue(formattedValue)
    onChange?.(formattedValue)
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        type="tel"
        value={inputValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <p className="text-xs text-gray-500">
        Default: China (+86). Example: 138 0013 8000
      </p>
    </div>
  )
}
