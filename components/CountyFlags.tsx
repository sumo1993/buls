'use client'

import { useState, useEffect } from 'react'

const counties = [
  { name: 'Bomi', color: '#FF6B6B', position: 0 },
  { name: 'Bong', color: '#4ECDC4', position: 1 },
  { name: 'Gbarpolu', color: '#45B7D1', position: 2 },
  { name: 'Grand Bassa', color: '#F7B731', position: 3 },
  { name: 'Grand Cape Mount', color: '#5F27CD', position: 4 },
  { name: 'Grand Gedeh', color: '#00D2D3', position: 5 },
  { name: 'Grand Kru', color: '#FF6348', position: 6 },
  { name: 'Lofa', color: '#1DD1A1', position: 7 },
  { name: 'Margibi', color: '#FD79A8', position: 8 },
  { name: 'Maryland', color: '#A29BFE', position: 9 },
  { name: 'Montserrado', color: '#FDCB6E', position: 10 },
  { name: 'Nimba', color: '#6C5CE7', position: 11 },
  { name: 'River Cess', color: '#00B894', position: 12 },
  { name: 'River Gee', color: '#E17055', position: 13 },
  { name: 'Sinoe', color: '#74B9FF', position: 14 },
]

export default function CountyFlags() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="relative flex items-center justify-center h-[600px]">
        <div className="absolute z-10 w-48 h-48 rounded-full bg-white shadow-2xl flex items-center justify-center border-[6px] border-[#EF3340]">
          <div className="text-center animate-pulse">
            <div className="text-8xl mb-2">🇱🇷</div>
            <p className="text-base font-black text-[#00205B] tracking-wider">LIBERIA</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex items-center justify-center h-[600px]">
      {/* Central Liberian Flag */}
      <div className="absolute z-10 w-48 h-48 rounded-full bg-white shadow-2xl flex items-center justify-center border-[6px] border-[#EF3340]">
        <div className="text-center animate-pulse">
          <div className="text-8xl mb-2">🇱🇷</div>
          <p className="text-base font-black text-[#00205B] tracking-wider">LIBERIA</p>
        </div>
      </div>

      {/* Rotating County Badges Circle */}
      <div className="absolute w-[520px] h-[520px] animate-spin-slow">
        {counties.map((county, index) => {
          const angle = (county.position * 360) / 15
          const radius = 210
          const x = Math.cos((angle * Math.PI) / 180) * radius
          const y = Math.sin((angle * Math.PI) / 180) * radius
          
          return (
            <div
              key={county.name}
              className="absolute w-28 h-20 rounded-lg shadow-2xl border-3 border-white animate-counter-spin-slow overflow-hidden flex items-center justify-center"
              style={{
                left: `calc(50% + ${x}px - 3.5rem)`,
                top: `calc(50% + ${y}px - 2.5rem)`,
                animationDelay: `${index * 0.067}s`,
                backgroundColor: county.color,
              }}
              title={`${county.name} County`}
            >
              <div className="text-center p-2">
                <p className="text-white font-bold text-xs leading-tight drop-shadow-lg">
                  {county.name}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Decorative circles */}
      <div className="absolute w-[560px] h-[560px] rounded-full border-[3px] border-dashed border-[#EF3340] opacity-40"></div>
      <div className="absolute w-[520px] h-[520px] rounded-full border-[3px] border-dashed border-[#00205B] opacity-30 animate-pulse"></div>
      <div className="absolute w-[480px] h-[480px] rounded-full border-[2px] border-dashed border-[#EF3340] opacity-25"></div>
    </div>
  )
}
