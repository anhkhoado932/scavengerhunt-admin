"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { supabase, type GlobalsData } from "@/lib/supabase"
import { AlertCircle, CheckCircle2, Loader2, Play, Flag, Trophy, RefreshCcw, AlertTriangle } from "lucide-react"

export function GameControlDashboard() {
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [globals, setGlobals] = useState<GlobalsData | null>(null)

  const fetchGlobals = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('globals')
        .select('*')
        .limit(1)
        .single()

      if (error) {
        // If the error is because no rows were found, create a new globals entry
        if (error.code === 'PGRST116') {
          await createGlobalsEntry()
          return
        }
        throw error
      }
      
      setGlobals(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching globals:', err)
      setError('Failed to load game state')
    } finally {
      setLoading(false)
    }
  }

  const createGlobalsEntry = async () => {
    try {
      const newGlobals = {
        game_has_started: false,
        checkpoint1_has_completed: false,
        checkpoint2_has_completed: false,
        checkpoint3_has_completed: false
      }
      
      const { data, error } = await supabase
        .from('globals')
        .insert(newGlobals)
        .select()
        .single()
        
      if (error) throw error
      
      setGlobals(data)
      toast.success('Game state initialized successfully')
    } catch (err) {
      console.error('Error creating globals entry:', err)
      setError('Failed to initialize game state')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGlobals()

    // Set up realtime subscription
    const channel = supabase
      .channel('globals-changes')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'globals' 
      }, (payload) => {
        setGlobals(payload.new as GlobalsData)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const updateGameState = async (key: keyof Omit<GlobalsData, 'id'>, value: boolean) => {
    if (!globals) return
    
    setUpdating(true)
    try {
      let updates: Partial<GlobalsData> = { [key]: value }
      
      // If turning off a checkpoint, also turn off dependent checkpoints
      if (!value) {
        if (key === 'game_has_started') {
          updates = {
            ...updates,
            checkpoint1_has_completed: false,
            checkpoint2_has_completed: false,
            checkpoint3_has_completed: false
          }
        } else if (key === 'checkpoint1_has_completed') {
          updates = {
            ...updates,
            checkpoint2_has_completed: false,
            checkpoint3_has_completed: false
          }
        } else if (key === 'checkpoint2_has_completed') {
          updates = {
            ...updates,
            checkpoint3_has_completed: false
          }
        }
      }
      
      const { error } = await supabase
        .from('globals')
        .update(updates)
        .eq('id', globals.id)
      
      if (error) throw error
      
      toast.success(`Game state updated successfully`)
    } catch (err) {
      console.error('Error updating game state:', err)
      toast.error('Failed to update game state')
      // Refresh to get current state
      fetchGlobals()
    } finally {
      setUpdating(false)
    }
  }

  // Helper function to reset all checkpoints
  const resetAllCheckpoints = async () => {
    if (!globals) return
    
    setUpdating(true)
    try {
      const updates = {
        checkpoint1_has_completed: false,
        checkpoint2_has_completed: false,
        checkpoint3_has_completed: false
      }
      
      const { error } = await supabase
        .from('globals')
        .update(updates)
        .eq('id', globals.id)
      
      if (error) throw error
      
      toast.success('All checkpoints have been reset')
    } catch (err) {
      console.error('Error resetting checkpoints:', err)
      toast.error('Failed to reset checkpoints')
      fetchGlobals()
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <Card className="shadow-lg border-2 border-secondary">
        <CardHeader className="bg-muted/30 border-b pb-8 text-center">
          <CardTitle className="text-2xl font-bold">Game Control Dashboard</CardTitle>
          <CardDescription className="text-base mt-2">Loading game state...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="shadow-lg text-center">
        <AlertCircle className="h-5 w-5 mx-auto mb-2" />
        <AlertTitle className="text-lg font-bold">Error</AlertTitle>
        <AlertDescription className="mt-2">
          {error}
          <Button 
            className="mt-4 w-full" 
            onClick={fetchGlobals}
          >
            <RefreshCcw className="mr-2 h-4 w-4" /> Try Again
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!globals) {
    return (
      <Alert className="shadow-lg text-center">
        <AlertCircle className="h-5 w-5 mx-auto mb-2" />
        <AlertTitle className="text-lg font-bold">No Data Found</AlertTitle>
        <AlertDescription className="mt-2">
          No game state found in the database.
          <Button 
            className="mt-4 w-full"
            onClick={createGlobalsEntry}
          >
            Initialize Game State
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  // Calculate progress percentage
  const completedCheckpoints = [
    globals.checkpoint1_has_completed,
    globals.checkpoint2_has_completed,
    globals.checkpoint3_has_completed
  ].filter(Boolean).length;
  
  const progressPercentage = globals.game_has_started 
    ? Math.round((completedCheckpoints / 3) * 100) 
    : 0;

  return (
    <Card className="shadow-lg border-2 border-secondary overflow-hidden">
      {updating && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-lg flex flex-col items-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Updating...</p>
          </div>
        </div>
      )}
      
      <CardHeader className="bg-muted/30 border-b pb-6 text-center">
        <CardTitle className="text-2xl font-bold">Game Control Dashboard</CardTitle>
        <CardDescription className="text-base mt-2">
          Control the game state and checkpoint progression
        </CardDescription>
        
        {/* Progress Bar */}
        <div className="mt-6 w-full">
          <div className="flex justify-between mb-2 text-sm">
            <span>Progress: {progressPercentage}%</span>
            <span>{completedCheckpoints}/3 Checkpoints</span>
          </div>
          <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ease-out ${globals.game_has_started ? 'bg-primary' : 'bg-muted'}`} 
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Game Started Control */}
        <div className="border rounded-lg overflow-hidden shadow-sm">
          <div className={`p-4 flex items-center justify-between ${globals.game_has_started ? 'bg-primary/10' : 'bg-muted/50'}`}>
            <div className="flex items-center">
              <div className={`mr-4 p-2 rounded-full ${globals.game_has_started ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <Play className="h-6 w-6" />
              </div>
              <div>
                <Label htmlFor="game-started" className="text-lg font-semibold block">Game Started</Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {globals.game_has_started ? 'Game is active' : 'Game is inactive'}
                </p>
              </div>
            </div>
            <Switch
              id="game-started"
              checked={globals.game_has_started}
              onCheckedChange={(checked) => updateGameState('game_has_started', checked)}
              disabled={updating}
              className="data-[state=checked]:bg-primary"
            />
          </div>
          {!globals.game_has_started && (
            <div className="px-4 py-3 bg-yellow-500/10 border-t">
              <div className="flex items-center text-yellow-500">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <p className="text-sm font-medium">
                  Starting the game enables checkpoint management
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Checkpoints */}
        <div className="grid gap-4">
          {/* Checkpoint 1 */}
          <div className="border rounded-lg overflow-hidden shadow-sm">
            <div className={`p-4 flex items-center justify-between ${
              !globals.game_has_started 
                ? 'bg-muted/30 opacity-70' 
                : globals.checkpoint1_has_completed 
                  ? 'bg-green-500/10' 
                  : 'bg-muted/50'
            }`}>
              <div className="flex items-center">
                <div className={`mr-4 p-2 rounded-full ${
                  !globals.game_has_started 
                    ? 'bg-muted text-muted-foreground' 
                    : globals.checkpoint1_has_completed 
                      ? 'bg-green-500/20 text-green-500' 
                      : 'bg-primary/20 text-primary'
                }`}>
                  <Flag className="h-6 w-6" />
                </div>
                <div>
                  <Label htmlFor="checkpoint1" className={`text-lg font-semibold block ${!globals.game_has_started ? 'text-muted-foreground' : ''}`}>
                    Checkpoint 1
                  </Label>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {globals.checkpoint1_has_completed ? 'Completed' : 'Not completed'}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                {globals.game_has_started && globals.checkpoint1_has_completed && (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                )}
                <Switch
                  id="checkpoint1"
                  checked={globals.checkpoint1_has_completed}
                  onCheckedChange={(checked) => updateGameState('checkpoint1_has_completed', checked)}
                  disabled={updating || !globals.game_has_started}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
            </div>
          </div>
          
          {/* Checkpoint 2 */}
          <div className="border rounded-lg overflow-hidden shadow-sm">
            <div className={`p-4 flex items-center justify-between ${
              !globals.game_has_started || !globals.checkpoint1_has_completed
                ? 'bg-muted/30 opacity-70' 
                : globals.checkpoint2_has_completed 
                  ? 'bg-green-500/10' 
                  : 'bg-muted/50'
            }`}>
              <div className="flex items-center">
                <div className={`mr-4 p-2 rounded-full ${
                  !globals.game_has_started || !globals.checkpoint1_has_completed
                    ? 'bg-muted text-muted-foreground' 
                    : globals.checkpoint2_has_completed 
                      ? 'bg-green-500/20 text-green-500' 
                      : 'bg-primary/20 text-primary'
                }`}>
                  <Flag className="h-6 w-6" />
                </div>
                <div>
                  <Label htmlFor="checkpoint2" className={`text-lg font-semibold block ${!globals.game_has_started || !globals.checkpoint1_has_completed ? 'text-muted-foreground' : ''}`}>
                    Checkpoint 2
                  </Label>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {globals.checkpoint2_has_completed ? 'Completed' : 'Not completed'}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                {!globals.checkpoint1_has_completed && globals.game_has_started && (
                  <div className="text-yellow-500 flex items-center mr-2">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    <span className="text-xs font-medium">Requires CP1</span>
                  </div>
                )}
                {globals.game_has_started && globals.checkpoint2_has_completed && (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                )}
                <Switch
                  id="checkpoint2"
                  checked={globals.checkpoint2_has_completed}
                  onCheckedChange={(checked) => updateGameState('checkpoint2_has_completed', checked)}
                  disabled={updating || !globals.game_has_started || !globals.checkpoint1_has_completed}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
            </div>
          </div>
          
          {/* Checkpoint 3 */}
          <div className="border rounded-lg overflow-hidden shadow-sm">
            <div className={`p-4 flex items-center justify-between ${
              !globals.game_has_started || !globals.checkpoint1_has_completed || !globals.checkpoint2_has_completed
                ? 'bg-muted/30 opacity-70' 
                : globals.checkpoint3_has_completed 
                  ? 'bg-green-500/10' 
                  : 'bg-muted/50'
            }`}>
              <div className="flex items-center">
                <div className={`mr-4 p-2 rounded-full ${
                  !globals.game_has_started || !globals.checkpoint1_has_completed || !globals.checkpoint2_has_completed
                    ? 'bg-muted text-muted-foreground' 
                    : globals.checkpoint3_has_completed 
                      ? 'bg-green-500/20 text-green-500' 
                      : 'bg-primary/20 text-primary'
                }`}>
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <Label htmlFor="checkpoint3" className={`text-lg font-semibold block ${!globals.game_has_started || !globals.checkpoint1_has_completed || !globals.checkpoint2_has_completed ? 'text-muted-foreground' : ''}`}>
                    Checkpoint 3
                  </Label>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {globals.checkpoint3_has_completed ? 'Completed' : 'Not completed'}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                {!globals.checkpoint2_has_completed && globals.game_has_started && globals.checkpoint1_has_completed && (
                  <div className="text-yellow-500 flex items-center mr-2">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    <span className="text-xs font-medium">Requires CP2</span>
                  </div>
                )}
                {globals.game_has_started && globals.checkpoint3_has_completed && (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                )}
                <Switch
                  id="checkpoint3"
                  checked={globals.checkpoint3_has_completed}
                  onCheckedChange={(checked) => updateGameState('checkpoint3_has_completed', checked)}
                  disabled={updating || !globals.game_has_started || !globals.checkpoint1_has_completed || !globals.checkpoint2_has_completed}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="bg-muted/30 border-t p-4 flex justify-center gap-3">
        <Button 
          variant="outline" 
          onClick={fetchGlobals}
          disabled={updating}
          className="h-10"
        >
          <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
        </Button>
        <Button 
          variant="destructive" 
          disabled={updating || !globals.game_has_started}
          className="h-10"
          onClick={() => {
            if (confirm('Are you sure you want to reset all checkpoints?')) {
              resetAllCheckpoints()
            }
          }}
        >
          Reset Checkpoints
        </Button>
      </CardFooter>
    </Card>
  )
} 