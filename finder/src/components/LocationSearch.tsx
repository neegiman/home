'use client'

import { FormEvent, useState } from 'react'

interface LocationSearchProps {
  isLocating: boolean
  isSearchingAddress: boolean
  onAddressSearch: (address: string) => void
  onCurrentLocation: () => void
}

export function LocationSearch({
  isLocating,
  isSearchingAddress,
  onAddressSearch,
  onCurrentLocation,
}: LocationSearchProps) {
  const [address, setAddress] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedAddress = address.trim()
    if (trimmedAddress) {
      onAddressSearch(trimmedAddress)
    }
  }

  return (
    <div className="location-controls">
      <button
        className="current-location-button"
        disabled={isLocating}
        onClick={onCurrentLocation}
        type="button"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M12 8.25A3.75 3.75 0 1 0 12 15.75 3.75 3.75 0 0 0 12 8.25Zm8.25 2.85A8.27 8.27 0 0 0 12.9 3.75V2.4a.9.9 0 1 0-1.8 0v1.35a8.27 8.27 0 0 0-7.35 7.35H2.4a.9.9 0 1 0 0 1.8h1.35a8.27 8.27 0 0 0 7.35 7.35v1.35a.9.9 0 1 0 1.8 0v-1.35a8.27 8.27 0 0 0 7.35-7.35h1.35a.9.9 0 1 0 0-1.8h-1.35ZM12 18.5A6.5 6.5 0 1 1 12 5.5a6.5 6.5 0 0 1 0 13Z" />
        </svg>
        {isLocating ? '위치 확인 중…' : '현재 위치 사용'}
      </button>

      <div className="location-divider" aria-hidden="true">
        <span>또는</span>
      </div>

      <form className="address-form" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="address">
          주소
        </label>
        <div className="address-input-wrap">
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M12 2.75a7 7 0 0 0-7 7c0 5.11 6.1 10.86 6.36 11.1a.94.94 0 0 0 1.28 0C12.9 20.61 19 14.86 19 9.75a7 7 0 0 0-7-7Zm0 16.06c-1.77-1.84-5.12-5.9-5.12-9.06a5.12 5.12 0 1 1 10.24 0c0 3.15-3.35 7.22-5.12 9.06Zm0-12.06a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0 4.13a1.13 1.13 0 1 1 0-2.26 1.13 1.13 0 0 1 0 2.26Z" />
          </svg>
          <input
            id="address"
            onChange={(event) => setAddress(event.target.value)}
            placeholder="도로명 또는 지번 주소"
            type="search"
            value={address}
          />
        </div>
        <button disabled={!address.trim() || isSearchingAddress} type="submit">
          {isSearchingAddress ? '검색 중…' : '검색'}
        </button>
      </form>
    </div>
  )
}
