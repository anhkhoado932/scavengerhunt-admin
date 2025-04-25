import { GameControlDashboard } from "@/components/game-control-dashboard"

export default function Home() {
  return (
    <div className="py-10 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center">Game Control Dashboard</h1>
      <GameControlDashboard />
    </div>
  )
}
