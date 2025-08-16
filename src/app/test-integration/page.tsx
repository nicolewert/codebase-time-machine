'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

type TestStatus = 'idle' | 'running' | 'success' | 'error'

interface TestResult {
  name: string
  status: TestStatus
  message?: string
  data?: any
}

export default function IntegrationTestPage() {
  const [tests, setTests] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [repositoryId, setRepositoryId] = useState<string | null>(null)

  const insertCommits = useMutation(api.commits.insertCommits)
  const insertFiles = useMutation(api.files.insertFiles)
  const createRepository = useMutation(api.repositories.create)

  const updateTest = (name: string, status: TestStatus, message?: string, data?: any) => {
    setTests(prev => {
      const existing = prev.find(t => t.name === name)
      if (existing) {
        return prev.map(t => t.name === name ? { ...t, status, message, data } : t)
      }
      return [...prev, { name, status, message, data }]
    })
  }

  const runTest = async (name: string, testFn: () => Promise<any>) => {
    updateTest(name, 'running')
    try {
      const result = await testFn()
      updateTest(name, 'success', 'Test passed', result)
      return result
    } catch (error) {
      updateTest(name, 'error', error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }

  const runIntegrationTests = async () => {
    setIsRunning(true)
    setTests([])

    try {
      // Test 1: Create repository
      const repo = await runTest('Create Repository', async () => {
        return await createRepository({
          name: 'Test Repository',
          url: 'file:///Users/nicolewert/codebase-time-machine',
          description: 'Integration test repository',
          status: 'active'
        })
      })

      setRepositoryId(repo)

      // Test 2: Parse Git Repository via API
      const parseResult = await runTest('Parse Git Repository', async () => {
        const response = await fetch('/api/git/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repositoryPath: '/Users/nicolewert/codebase-time-machine',
            repositoryId: repo
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(`API Error: ${error.error}`)
        }

        return await response.json()
      })

      // Test 3: Insert commits into Convex
      await runTest('Insert Commits to Convex', async () => {
        const commits = parseResult.data.commits.slice(0, 5) // Test with first 5 commits
        return await insertCommits({ commits })
      })

      // Test 4: Insert files into Convex
      await runTest('Insert Files to Convex', async () => {
        const files = parseResult.data.files.slice(0, 10) // Test with first 10 files
        return await insertFiles({ files })
      })

      // Test 5: Test Git Log API
      await runTest('Git Log API', async () => {
        const response = await fetch(`/api/git/${repo}/log?path=/Users/nicolewert/codebase-time-machine&max-count=3&format=pretty`)
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(`Log API Error: ${error.error}`)
        }

        return await response.json()
      })

      // Test 6: Test security (should fail)
      await runTest('Security Test (Path Traversal)', async () => {
        const response = await fetch('/api/git/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repositoryPath: '/Users/nicolewert/../../../etc/passwd',
            repositoryId: repo
          })
        })

        const result = await response.json()
        
        if (response.ok) {
          throw new Error('Security test failed - dangerous path was allowed')
        }

        if (!result.error?.includes('not in an allowed directory')) {
          throw new Error('Wrong security error message')
        }

        return { blocked: true, error: result.error }
      })

    } catch (error) {
      console.error('Integration test failed:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return <div className="w-5 h-5 rounded-full bg-gray-300" />
    }
  }

  const getStatusBadge = (status: TestStatus) => {
    switch (status) {
      case 'running':
        return <Badge variant="secondary">Running</Badge>
      case 'success':
        return <Badge variant="default" className="bg-green-500">Passed</Badge>
      case 'error':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">Pending</Badge>
    }
  }

  const successCount = tests.filter(t => t.status === 'success').length
  const totalTests = tests.length
  const progress = totalTests > 0 ? (successCount / totalTests) * 100 : 0

  return (
    <div className="container mx-auto p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Git History Parsing System - Integration Tests</CardTitle>
          <div className="flex items-center space-x-4 mt-4">
            <Button 
              onClick={runIntegrationTests} 
              disabled={isRunning}
              className="flex items-center space-x-2"
            >
              {isRunning && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isRunning ? 'Running Tests...' : 'Run Integration Tests'}</span>
            </Button>
            {totalTests > 0 && (
              <div className="flex items-center space-x-2">
                <Progress value={progress} className="w-32" />
                <span className="text-sm text-gray-600">
                  {successCount}/{totalTests} passed
                </span>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {tests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tests.map((test) => (
                <div key={test.name} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(test.status)}
                    <div>
                      <div className="font-medium">{test.name}</div>
                      {test.message && (
                        <div className="text-sm text-gray-600 mt-1">{test.message}</div>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(test.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {repositoryId && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Test Repository ID</CardTitle>
          </CardHeader>
          <CardContent>
            <code className="bg-gray-100 p-2 rounded text-sm">{repositoryId}</code>
          </CardContent>
        </Card>
      )}
    </div>
  )
}