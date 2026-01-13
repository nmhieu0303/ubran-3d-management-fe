import {
  FullscreenExit as FullscreenExitIcon,
  Fullscreen as FullscreenIcon,
  RestartAlt as ResetIcon,
} from '@mui/icons-material';
import { Box, CircularProgress, Dialog, IconButton, Tooltip, Typography } from '@mui/material';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import React, { Suspense, useRef, useState } from 'react';
import * as THREE from 'three';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface ModelViewerProps {
  url?: string;
}

function Model({ url, onLoad }: { url: string; onLoad: () => void }) {
  const { scene } = useGLTF(url);
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  React.useEffect(() => {
    if (scene) {
      const box = new THREE.Box3().setFromObject(scene);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

      cameraZ *= 1.5;

      camera.position.set(center.x, center.y, center.z + cameraZ);
      camera.lookAt(center);

      if (controlsRef.current) {
        controlsRef.current.target.copy(center);
        controlsRef.current.update();
      }

      onLoad();
    }
  }, [scene, camera, onLoad]);

  return (
    <>
      <primitive object={scene} />
      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        autoRotate={false}
      />
    </>
  );
}


function ResetCameraButton({ onReset }: { onReset: () => void }) {
  return (
    <Tooltip title="Reset Camera">
      <IconButton
        onClick={onReset}
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 1)',
          },
          zIndex: 10,
        }}
        size="small"
      >
        <ResetIcon />
      </IconButton>
    </Tooltip>
  );
}


function FullscreenButton({
  onToggle,
  isFullscreen,
}: {
  onToggle: () => void;
  isFullscreen: boolean;
}) {
  return (
    <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
      <IconButton
        onClick={onToggle}
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 56,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 1)',
          },
          zIndex: 10,
        }}
        size="small"
      >
        {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
      </IconButton>
    </Tooltip>
  );
}

export const ModelViewer: React.FC<ModelViewerProps> = ({ url = '/assets/models/Tower.glb' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const canvasRef = useRef<any>(null);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleResetCamera = () => {
    if (canvasRef.current) {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
      }, 100);
    }
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const modelUrl = url;

  const ModelViewerContent = () => (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        border: '1px solid #ccc',
        borderRadius: isFullscreen ? 0 : 1,
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
      }}
    >
      <Canvas
        ref={canvasRef}
        key={modelUrl}
        camera={{ position: [0, 0, 5], fov: 75 }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 5]} intensity={1.2} />
        <directionalLight position={[-10, -10, -5]} intensity={0.4} />
        <Suspense fallback={null}>
          <Model url={modelUrl} onLoad={handleLoad} />
        </Suspense>
      </Canvas>

      <ResetCameraButton onReset={handleResetCamera} />
      <FullscreenButton onToggle={handleToggleFullscreen} isFullscreen={isFullscreen} />

      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 5,
          }}
        >
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Loading 3D Model...
          </Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <ErrorBoundary>
      <>
        <ModelViewerContent />
        <Dialog
          open={isFullscreen}
          onClose={handleToggleFullscreen}
          maxWidth="lg"
          fullWidth
          sx={{
            '& .MuiDialog-paper': {
              height: '90vh',
              maxHeight: '90vh',
            },
          }}
        >
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: '100%',
              padding: 1,
            }}
          >
            <Canvas
              ref={canvasRef}
              key={`${modelUrl}-expanded`}
              camera={{ position: [0, 0, 5], fov: 75 }}
              style={{ width: '100%', height: '100%', borderRadius: '4px' }}
            >
              <ambientLight intensity={0.8} />
              <directionalLight position={[10, 10, 5]} intensity={1.2} />
              <directionalLight position={[-10, -10, -5]} intensity={0.4} />
              <Suspense fallback={null}>
                <Model url={modelUrl} onLoad={handleLoad} />
              </Suspense>
            </Canvas>

            <ResetCameraButton onReset={handleResetCamera} />

            <Tooltip title="Close">
              <IconButton
                onClick={handleToggleFullscreen}
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 1)',
                  },
                  zIndex: 10,
                }}
                size="small"
              >
                <FullscreenExitIcon />
              </IconButton>
            </Tooltip>

            {isLoading && (
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  zIndex: 5,
                }}
              >
                <CircularProgress />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Loading 3D Model...
                </Typography>
              </Box>
            )}
          </Box>
        </Dialog>
      </>
    </ErrorBoundary>
  );
};
