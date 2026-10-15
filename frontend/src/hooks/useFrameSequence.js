import { useEffect, useRef } from 'react'

// Cargar URLs de frames de forma estática para evitar cientos de requests dinámicos de módulos JS
const frameModules = import.meta.glob('../assets/sumaq/sequence/desktop/frame-*.webp', {
  eager: true,
  import: 'default',
  query: '?url',
})

// Ordenar las rutas y muestrear 1 de cada 3 frames (~81 frames) para fluidez de 60fps sin sobrecarga
const sortedKeys = Object.keys(frameModules).sort((a, b) => a.localeCompare(b))
const sampledUrls = sortedKeys
  .filter((_, idx) => idx % 3 === 0 || idx === sortedKeys.length - 1)
  .map((key) => frameModules[key])

function getSourcePan(progress, maxPan) {
  const rightReveal = maxPan * 0.95
  const leftReveal = maxPan * 0.65
  if (progress <= 0.25) return rightReveal * (progress / 0.25)
  if (progress <= 0.5) return rightReveal - ((rightReveal + leftReveal) * ((progress - 0.25) / 0.25))
  if (progress <= 0.75) return -leftReveal + ((rightReveal + leftReveal) * ((progress - 0.5) / 0.25))
  return rightReveal * (1 - ((progress - 0.75) / 0.25))
}

function drawCover(context, image, width, height, pixelRatio, progress) {
  if (!image || !image.complete || image.naturalWidth === 0) return

  const imageRatio = image.naturalWidth / image.naturalHeight
  const canvasRatio = width / height
  const sourceWidth = imageRatio > canvasRatio ? image.naturalHeight * canvasRatio : image.naturalWidth
  const sourceHeight = imageRatio > canvasRatio ? image.naturalHeight : image.naturalWidth / canvasRatio
  const centeredSourceX = (image.naturalWidth - sourceWidth) / 2
  const sourceY = (image.naturalHeight - sourceHeight) / 2
  const maxPan = Math.min(Math.max(0, centeredSourceX), width * 0.18)
  const sourceX = Math.min(image.naturalWidth - sourceWidth, Math.max(0, centeredSourceX + getSourcePan(progress, maxPan)))

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height)
}

export function useFrameSequence(sectionRef, canvasRef, onFirstFrameDecoded) {
  const currentFrameRef = useRef(-1)
  const requestedFrameRef = useRef(0)
  const onFirstFrameDecodedRef = useRef(onFirstFrameDecoded)

  // Mantener referencia estable al callback sin provocar reinicio del efecto de canvas
  useEffect(() => {
    onFirstFrameDecodedRef.current = onFirstFrameDecoded
  })

  useEffect(() => {
    const section = sectionRef.current
    const canvas = canvasRef.current
    if (!section || !canvas) return

    const stage = canvas.parentElement
    // alpha: false permite renderizado opaco acelerado por hardware sin compositing transparente
    const context = canvas.getContext('2d', { alpha: false, desynchronized: true })
    const images = Array(sampledUrls.length).fill(null)
    const loading = new Set()
    let renderFrameId = 0
    let disposed = false
    let viewport = { width: 0, height: 0, pixelRatio: 1 }
    let scrollProgress = 0
    let trigger = null
    let hasDecodedFirstFrame = false

    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'medium'

    const render = (frameIndex, force = false) => {
      const image = images[frameIndex]
      if (!image || disposed || (!force && frameIndex === currentFrameRef.current)) return
      currentFrameRef.current = frameIndex
      if (renderFrameId) cancelAnimationFrame(renderFrameId)
      renderFrameId = requestAnimationFrame(() => {
        renderFrameId = 0
        drawCover(context, image, viewport.width, viewport.height, viewport.pixelRatio, scrollProgress)
      })
    }

    const getClosestLoadedIndex = (target) => {
      if (images[target]) return target
      let l = target - 1
      let r = target + 1
      while (l >= 0 || r < sampledUrls.length) {
        if (r < sampledUrls.length && images[r]) return r
        if (l >= 0 && images[l]) return l
        l--
        r++
      }
      return -1
    }

    const loadFrame = (frameIndex) => {
      if (frameIndex < 0 || frameIndex >= sampledUrls.length || images[frameIndex] || loading.has(frameIndex)) return
      loading.add(frameIndex)

      const image = new Image()
      image.decoding = 'async'
      image.src = sampledUrls[frameIndex]

      const onDone = () => {
        loading.delete(frameIndex)
        if (disposed) return
        images[frameIndex] = image

        if (frameIndex === 0 && !hasDecodedFirstFrame) {
          hasDecodedFirstFrame = true
          onFirstFrameDecodedRef.current?.()
          scheduleIdlePreload()
        }

        if (frameIndex === requestedFrameRef.current || currentFrameRef.current === -1) {
          render(frameIndex)
        }
      }

      if (image.complete) {
        onDone()
      } else {
        image.onload = onDone
        image.onerror = () => loading.delete(frameIndex)
      }
    }

    const preloadAround = (frameIndex) => {
      loadFrame(frameIndex)
      for (let offset = 1; offset <= 3; offset += 1) {
        loadFrame(frameIndex + offset)
        loadFrame(frameIndex - offset)
      }
    }

    let idlePreloadId = null
    const scheduleIdlePreload = () => {
      let nextFrame = 1
      const step = () => {
        if (disposed || nextFrame >= sampledUrls.length) return
        if (typeof window.requestIdleCallback === 'function') {
          idlePreloadId = window.requestIdleCallback((deadline) => {
            while ((deadline.timeRemaining() > 5 || deadline.didTimeout) && nextFrame < sampledUrls.length) {
              loadFrame(nextFrame)
              nextFrame++
            }
            if (nextFrame < sampledUrls.length) step()
          }, { timeout: 2000 })
        } else {
          idlePreloadId = setTimeout(() => {
            loadFrame(nextFrame)
            nextFrame++
            if (nextFrame < sampledUrls.length) step()
          }, 40)
        }
      }
      step()
    }

    const resizeCanvas = () => {
      if (disposed || !stage) return
      const dpr = Math.min(1.5, Math.max(1, window.devicePixelRatio || 1))
      const newWidth = stage.clientWidth
      const newHeight = stage.clientHeight
      const targetWidth = Math.round(newWidth * dpr)
      const targetHeight = Math.round(newHeight * dpr)

      // Evitar reset del canvas si las dimensiones no cambiaron
      if (canvas.width === targetWidth && canvas.height === targetHeight && viewport.pixelRatio === dpr) {
        return
      }

      viewport = {
        width: newWidth,
        height: newHeight,
        pixelRatio: dpr
      }
      canvas.width = targetWidth
      canvas.height = targetHeight
      canvas.style.width = '100%'
      canvas.style.height = '100%'

      // Redibujar síncronamente de inmediato para evitar cualquier frame en blanco
      const currentIdx = currentFrameRef.current >= 0 ? currentFrameRef.current : 0
      const bestIdx = images[currentIdx] ? currentIdx : getClosestLoadedIndex(currentIdx)
      const imgToDraw = bestIdx >= 0 ? images[bestIdx] : images[0]
      if (imgToDraw) {
        drawCover(context, imgToDraw, viewport.width, viewport.height, viewport.pixelRatio, scrollProgress)
      }
    }

    resizeCanvas()
    preloadAround(0)

    const cancelIdle = () => {
      if (typeof window.cancelIdleCallback === 'function' && idlePreloadId) {
        window.cancelIdleCallback(idlePreloadId)
      } else if (idlePreloadId) {
        clearTimeout(idlePreloadId)
      }
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) {
      window.addEventListener('resize', resizeCanvas, { passive: true })
      return () => {
        disposed = true
        cancelIdle()
        if (renderFrameId) cancelAnimationFrame(renderFrameId)
        window.removeEventListener('resize', resizeCanvas)
      }
    }

    Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger')
    ]).then(([{ default: gsap }, { ScrollTrigger }]) => {
      if (disposed) return
      gsap.registerPlugin(ScrollTrigger)

      trigger = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: ({ progress }) => {
          const frameIndex = Math.min(
            sampledUrls.length - 1,
            Math.max(0, Math.round(progress * (sampledUrls.length - 1)))
          )
          scrollProgress = progress
          requestedFrameRef.current = frameIndex
          preloadAround(frameIndex)

          const indexToDraw = images[frameIndex] ? frameIndex : getClosestLoadedIndex(frameIndex)
          if (indexToDraw >= 0) {
            render(indexToDraw)
          }
        },
      })
    }).catch((err) => {
      console.warn('GSAP load error in useFrameSequence:', err)
    })

    window.addEventListener('resize', resizeCanvas, { passive: true })
    return () => {
      disposed = true
      cancelIdle()
      trigger?.kill()
      if (renderFrameId) cancelAnimationFrame(renderFrameId)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [canvasRef, sectionRef])

  return { totalFrames: sampledUrls.length }
}