# Shkia Clock ⏳

A Next.js application that displays a countdown timer to **Shkia** (Sunset) based on your location. It calculates Zmanim locally using the `kosher-zmanim` library.

## Features
- **Precise Calculation**: Uses Halachic times calculation.
- **Location Aware**: Automatically detects detailed location or accepts manual city input.
- **Urgency Themes**: The interface becomes more intense as time runs out!
  - **Normal**: Blue/Calm
  - **Warning**: Yellow
  - **Danger**: Red (Pulse)
  - **Panic**: Black/Red (Shake effect)

## Tech Stack
- **Framework**: Next.js 14
- **Styling**: Tailwind CSS
- **Library**: `kosher-zmanim`
