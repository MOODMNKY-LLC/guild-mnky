import { NextResponse } from 'next/server'

async function executeLocalQuery(query: string, readOnly: boolean = true) {
  // Execute SQL queries directly against local PostgreSQL database
  // This allows Platform Kit to work with local Supabase instances
  try {
    const { Client } = await import('pg')
    const dbUrl = process.env.SUPABASE_DB_URL
    
    if (!dbUrl) {
      throw new Error('SUPABASE_DB_URL is not configured in .env.local')
    }
    
    const client = new Client({ connectionString: dbUrl })
    await client.connect()
    
    try {
      const result = await client.query(query)
      await client.end()
      
      // Return result rows in Management API format (array of objects)
      return result.rows || []
    } catch (error: any) {
      await client.end()
      throw error
    }
  } catch (error: any) {
    // If pg module is not installed, provide helpful error
    if (error.message?.includes('Cannot find module') || error.code === 'MODULE_NOT_FOUND') {
      throw new Error('PostgreSQL client (pg) is not installed. Run: pnpm add pg @types/pg')
    }
    throw new Error(`Query execution failed: ${error.message}`)
  }
}

async function forwardToSupabaseAPI(request: Request, method: string, params: { path: string[] }) {
  const { path } = params
  const projectRef = path[2]

  // Check if this is a local project
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const isLocal = supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1') || projectRef === 'local'

  // Handle local project database queries - execute directly against local instance
  if (isLocal && projectRef === 'local' && path[3] === 'database' && path[4] === 'query' && method === 'POST') {
    try {
      const body = await request.json()
      const { query, read_only } = body

      if (!query) {
        return NextResponse.json(
          { message: 'SQL query is required' },
          { status: 400 }
        )
      }

      // Execute query against local Supabase instance
      const result = await executeLocalQuery(query, read_only ?? true)

      // Return in Management API format
      return NextResponse.json(result)
    } catch (error: any) {
      console.error('Local database query error:', error)
      return NextResponse.json(
        { 
          message: error.message || 'Query execution failed',
          error: error.message,
          hint: 'Make sure SUPABASE_DB_URL is configured in .env.local'
        },
        { status: 400 }
      )
    }
  }

  // Handle other local project endpoints - Management API doesn't support them
  if (isLocal && projectRef === 'local') {
    return NextResponse.json(
      { 
        message: 'The Supabase Management API does not support local projects for this endpoint. Please use Supabase Studio at http://localhost:54323 for local development, or connect to a cloud Supabase project.',
        isLocal: true,
        studioUrl: 'http://localhost:54323'
      },
      { status: 404 }
    )
  }

  // For non-local projects or non-database-query endpoints, use Management API
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  if (!process.env.SUPABASE_MANAGEMENT_API_TOKEN) {
    console.error('Supabase Management API token is not configured.')
    
    // Provide helpful error message for local development
    if (isLocal) {
      return NextResponse.json(
        { 
          message: 'Supabase Management API token is required for Platform Kit. The Management API is designed for cloud projects and may have limited functionality with local development. To get a token, visit https://supabase.com/dashboard/account/tokens and create a Personal Access Token. Add it to .env.local as SUPABASE_MANAGEMENT_API_TOKEN.',
          isLocal: true
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        message: 'Supabase Management API token is not configured. Please add SUPABASE_MANAGEMENT_API_TOKEN to your environment variables. Get a token from https://supabase.com/dashboard/account/tokens',
        isLocal: false
      },
      { status: 500 }
    )
  }

  const apiPath = path.join('/')

  const url = new URL(request.url)
  url.protocol = 'https'
  url.hostname = 'api.supabase.com'
  url.port = '443'
  url.pathname = apiPath

  // Implement your permission check here (e.g. check if the user is a member of the project)
  // In this example, everyone can access all projects
  const userHasPermissionForProject = Boolean(projectRef)

  if (!userHasPermissionForProject) {
    return NextResponse.json(
      { message: 'You do not have permission to access this project.' },
      { status: 403 }
    )
  }

  try {
    const forwardHeaders: HeadersInit = {
      // eslint-disable-next-line turbo/no-undeclared-env-vars
      Authorization: `Bearer ${process.env.SUPABASE_MANAGEMENT_API_TOKEN}`,
    }

    // Copy relevant headers from the original request
    const contentType = request.headers.get('content-type')
    if (contentType) {
      forwardHeaders['Content-Type'] = contentType
    }

    const fetchOptions: RequestInit = {
      method,
      headers: forwardHeaders,
    }

    // Include body for methods that support it
    if (method !== 'GET' && method !== 'HEAD') {
      try {
        const body = await request.text()
        if (body) {
          fetchOptions.body = body
        }
      } catch (error) {
        // Handle cases where body is not readable
        console.warn('Could not read request body:', error)
      }
    }

    const response = await fetch(url, fetchOptions)

    // Get response body
    const responseText = await response.text()
    let responseData

    try {
      responseData = responseText ? JSON.parse(responseText) : null
    } catch {
      responseData = responseText
    }

    // Return the response with the same status
    return NextResponse.json(responseData, { status: response.status })
  } catch (error: any) {
    console.error('Supabase API proxy error:', error)
    const errorMessage = error.message || 'An unexpected error occurred.'
    return NextResponse.json({ message: errorMessage }, { status: 500 })
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params
  return forwardToSupabaseAPI(request, 'GET', resolvedParams)
}

export async function HEAD(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params
  return forwardToSupabaseAPI(request, 'HEAD', resolvedParams)
}

export async function POST(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params
  return forwardToSupabaseAPI(request, 'POST', resolvedParams)
}

export async function PUT(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params
  return forwardToSupabaseAPI(request, 'PUT', resolvedParams)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params
  return forwardToSupabaseAPI(request, 'DELETE', resolvedParams)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params
  return forwardToSupabaseAPI(request, 'PATCH', resolvedParams)
}
