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
        checkpoint2_has_completed: false
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
            checkpoint2_has_completed: false
          }
        } else if (key === 'checkpoint1_has_completed') {
          updates = {
            ...updates,
            checkpoint2_has_completed: false
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
        game_has_started: false,
        checkpoint1_has_completed: false,
        checkpoint2_has_completed: false
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
    globals.checkpoint2_has_completed
  ].filter(Boolean).length;
  
  const progressPercentage = globals.game_has_started 
    ? Math.round((completedCheckpoints / 2) * 100) 
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
            <span>{completedCheckpoints}/2 Checkpoints</span>
          </div>
          <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ease-out ${globals.game_has_started ? 'bg-primary' : 'bg-muted'}`} 
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-4">
        {/* Game Started Control */}
        <Button
          onClick={() => updateGameState('game_has_started', !globals.game_has_started)}
          disabled={updating}
          className={`w-full py-2 px-4 rounded-lg transition-colors ${
            globals.game_has_started ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
          } text-white font-semibold`}
        >
          Game Started: {globals.game_has_started ? 'Yes' : 'No'}
        </Button>

        {/* Checkpoint 1 */}
        <Button
          onClick={() => updateGameState('checkpoint1_has_completed', !globals.checkpoint1_has_completed)}
          disabled={updating || !globals.game_has_started}
          className={`w-full py-2 px-4 rounded-lg transition-colors ${
            !globals.game_has_started 
              ? 'bg-gray-500 cursor-not-allowed' 
              : globals.checkpoint1_has_completed 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-red-500 hover:bg-red-600'
          } text-white font-semibold`}
        >
          CP1: {globals.checkpoint1_has_completed ? 'Active' : 'Inactive'}
        </Button>

        {/* Checkpoint 2 */}
        <Button
          onClick={() => updateGameState('checkpoint2_has_completed', !globals.checkpoint2_has_completed)}
          disabled={updating || !globals.game_has_started || !globals.checkpoint1_has_completed}
          className={`w-full py-2 px-4 rounded-lg transition-colors ${
            !globals.game_has_started || !globals.checkpoint1_has_completed
              ? 'bg-gray-500 cursor-not-allowed' 
              : globals.checkpoint2_has_completed 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-red-500 hover:bg-red-600'
          } text-white font-semibold`}
        >
          CP2: {globals.checkpoint2_has_completed ? 'Active' : 'Inactive'}
        </Button>

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