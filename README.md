# Bus Route Tycoon

A strategic bus line management simulator where you build and optimize public transportation networks across different cities.

## About

Design efficient bus routes to transport NPCs around the city. Balance ticket prices, operating costs, and service quality to build a profitable transit empire. Each city presents unique challenges with different layouts and passenger demands.

## Features

- **Multiple Cities**: Unlock new cities by achieving high happiness scores
- **Strategic Route Planning**: Create up to 8 different bus routes per city
- **Financial Management**: Balance income from ticket sales against operating costs and loans
- **Dynamic Traffic**: Rush hour traffic affects bus speeds throughout the day
- **Persistent Progress**: Your routes and finances are automatically saved
- **Build & Pan Modes**: Toggle between route editing and map exploration
- **Interactive Tutorial**: Learn the basics with a step-by-step guide

## How to Play

1. **Start in Pan Mode**: The game starts in Pan Mode - click the tool icon (🛠) to switch to Build Mode
2. **Add Bus Stops**: In Build Mode, click on roads to place bus stops
3. **Create Routes**: Stops are connected in order - buses will loop through your route
4. **Add Buses**: Use the + Bus button to add more buses to your active route
5. **Set Prices**: Adjust ticket prices to balance ridership and profit
6. **Manage Finances**: Take loans when needed, but watch out for interest costs
7. **Achieve Happiness**: Aim for high happiness scores (70+) to unlock new cities

## Scoring

Your **Happiness Score (0-100)** is based on:
- **Success Rate** (30pts): How many NPCs reach their destination
- **Low Wait Times** (30pts): Keeping NPCs from waiting too long
- **Fast Transport** (20pts): Getting NPCs to their destination quickly
- **Coverage** (20pts): How much of the city your routes serve

## Controls

### Desktop
- **B key**: Toggle Build/Pan Mode
- **Space**: Pause/Resume
- **Left-click**: Add stop (Build Mode) / Select stop
- **Right-click**: Delete stop (Build Mode)
- **Drag**: Move stops or pan the map
- **Mouse wheel**: Zoom in/out

### Mobile
- **Tap**: Add/Select stop
- **Long press**: Delete stop
- **Drag**: Move stops or pan (Pan Mode)
- **Pinch**: Zoom
- **Two-finger drag**: Pan the map

## Development

Built with TypeScript and Vite.

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Tips

- Connect residential zones (green) with commercial (blue) and industrial (yellow) areas
- Optimal stop spacing is 5-8 grid cells apart
- Ideal routes have 6-10 stops
- Add more buses during rush hours (7-9am, 5-7pm)
- Lower ticket prices increase ridership but reduce profit per trip
- Use loans strategically to expand your network

## License

All rights reserved.
