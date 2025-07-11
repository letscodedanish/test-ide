import { NextRequest, NextResponse } from 'next/server';
import * as k8s from '@kubernetes/client-node';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const isLocal = process.env.NODE_ENV === 'development';
    
    if (isLocal) {
      // Local development - just log the stop
      console.log(`Local playground stopped: ${id}`);
      
      return NextResponse.json({
        message: 'Playground stopped successfully (local mode)'
      });
    } else {
      // Production - stop the actual container
      const podName = `playground-${id}`;
      const namespace = 'cursor-test';
      
      try {
        // Delete the pod
        const kc = new k8s.KubeConfig();
        kc.loadFromDefault();
        const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
        
        await k8sApi.deleteNamespacedPod(podName, namespace);
        
        // Container stopped - in production this would notify WebSocket clients
        console.log(`Container stopped: ${podName} in namespace: ${namespace}`);
        
        return NextResponse.json({
          message: 'Playground container stopped successfully',
          podName,
          namespace
        });
      } catch (error) {
        console.error('Failed to stop container:', error);
        return NextResponse.json({ 
          error: 'Failed to stop playground container',
          details: error.message 
        }, { status: 500 });
      }
    }
  } catch (error) {
    console.error('Error stopping playground:', error);
    return NextResponse.json({ error: 'Failed to stop playground' }, { status: 500 });
  }
}