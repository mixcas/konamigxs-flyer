import React, { type ClipboardEvent, useEffect, useRef, useState } from 'react'
import { PantoneSelect } from './PantoneSelect'
import {
  Accordion,
  Alert,
  AppShell,
  Button,
  ColorInput,
  Group,
  Paper,
  ScrollArea,
  Select,
  Slider,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { toPng } from 'html-to-image'
import './App.css'

type FlyerFormValues = {
  title: string
  subtitleLeft: string
  subtitleRight: string
  info: string
  centerImage: string
  backgroundImage: string
  fontColor: string
  backgroundColor: string
  bgImageOpacity: number
  bgImageBlend: string
}

type ImageField = 'centerImage' | 'backgroundImage'

const STORAGE_KEY = 'konamigxs-flyer-form'

const DEFAULT_FLYER_VALUES: FlyerFormValues = {
  title: 'AfroStreetStyles',
  subtitleLeft: 'Sesión Principiante',
  subtitleRight: 'Enrique',
  info: 'JUEVES    26    MAR    7:00PM\nUbi      por      DM      $100\nLEÓN             GUANAJUATO',
  centerImage: '',
  backgroundImage: '',
  fontColor: '#f6f3eb',
  backgroundColor: '#5b9bce',
  bgImageOpacity: 1,
  bgImageBlend: 'normal',
}

const fields = Object.keys(DEFAULT_FLYER_VALUES) as (keyof FlyerFormValues)[]

function normalizeStoredValues(value: unknown): FlyerFormValues {
  if (!value || typeof value !== 'object') {
    return DEFAULT_FLYER_VALUES
  }

  const stored = value as Partial<Record<keyof FlyerFormValues, unknown>>
  const merged = { ...DEFAULT_FLYER_VALUES }

  for (const field of fields) {
    const val = stored[field]
    if (typeof val === 'string') {
      merged[field] = val as never
    } else if (typeof val === 'number' && typeof merged[field] === 'number') {
      merged[field] = val as never
    }
  }

  return merged
}

function readStoredValues(): FlyerFormValues {
  if (typeof window === 'undefined') {
    return DEFAULT_FLYER_VALUES
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored ? normalizeStoredValues(JSON.parse(stored)) : DEFAULT_FLYER_VALUES
  } catch {
    return DEFAULT_FLYER_VALUES
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function makeDownloadName(title: string) {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  return `${slug || 'flyer'}.png`
}

const FLYER_W = 540
const FLYER_H = 960
const STAGE_MARGIN = 48

function App() {
  const previewRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const infoRef = useRef<HTMLParagraphElement>(null)
  const imageFrameRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [imageFrameTop, setImageFrameTop] = useState(0)
  const [handleTop, setHandleTop] = useState(0)
  const [message, setMessage] = useState('Paste an image into a panel or use the paste buttons.')
  const [isExporting, setIsExporting] = useState(false)
  const form = useForm<FlyerFormValues>({
    initialValues: readStoredValues(),
  })
  const values = form.values

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values))
    } catch {
      console.warn('Unable to save flyer values to localStorage.')
    }
  }, [values])

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect()
      const s = Math.min(
        (width - STAGE_MARGIN) / FLYER_W,
        (height - STAGE_MARGIN) / FLYER_H,
      )
      setScale(Math.max(s, 0.05))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const update = () => {
      if (!headerRef.current || !infoRef.current) return
      const headerBottom = headerRef.current.offsetTop + headerRef.current.offsetHeight
      const infoTop = infoRef.current.offsetTop
      const newImageFrameTop = (headerBottom + infoTop) / 2
      setImageFrameTop(newImageFrameTop)
      if (imageFrameRef.current) {
        const imageFrameBottom = newImageFrameTop + imageFrameRef.current.offsetHeight / 2
        setHandleTop((imageFrameBottom + infoTop) / 2)
      }
    }
    const ro = new ResizeObserver(update)
    if (headerRef.current) ro.observe(headerRef.current)
    if (infoRef.current) ro.observe(infoRef.current)
    if (imageFrameRef.current) ro.observe(imageFrameRef.current)
    update()
    return () => ro.disconnect()
  }, [])

  const setImageFromBlob = async (field: ImageField, blob: Blob) => {
    const dataUrl = await blobToDataUrl(blob)
    form.setFieldValue(field, dataUrl)
    setMessage(field === 'centerImage' ? 'Center image updated.' : 'Background image updated.')
  }

  const handlePaste = async (event: ClipboardEvent<HTMLDivElement>, field: ImageField) => {
    const imageItem = Array.from(event.clipboardData.items).find((item) =>
      item.type.startsWith('image/'),
    )
    const file = imageItem?.getAsFile()

    if (!file) {
      setMessage('Clipboard did not include an image.')
      return
    }

    event.preventDefault()
    await setImageFromBlob(field, file)
  }

  const readClipboardImage = async (field: ImageField) => {
    if (!navigator.clipboard?.read) {
      setMessage('This browser does not support image paste buttons. Focus a panel and paste instead.')
      return
    }

    try {
      const clipboardItems = await navigator.clipboard.read()

      for (const item of clipboardItems) {
        const imageType = item.types.find((type) => type.startsWith('image/'))

        if (imageType) {
          await setImageFromBlob(field, await item.getType(imageType))
          return
        }
      }

      setMessage('Clipboard did not include an image.')
    } catch {
      setMessage('Clipboard access was blocked. Focus a panel and paste instead.')
    }
  }

  const clearImage = (field: ImageField) => {
    form.setFieldValue(field, '')
    setMessage(field === 'centerImage' ? 'Center image cleared.' : 'Background image cleared.')
  }

  const resetFlyer = () => {
    window.localStorage.removeItem(STORAGE_KEY)
    form.setValues(DEFAULT_FLYER_VALUES)
    setMessage('Flyer reset to defaults.')
  }

  const exportFlyer = async () => {
    if (!previewRef.current) {
      return
    }

    setIsExporting(true)

    try {
      const dataUrl = await toPng(previewRef.current, {
        backgroundColor: values.backgroundColor,
        cacheBust: true,
        width: FLYER_W,
        height: FLYER_H,
        pixelRatio: 2,
        style: { transform: 'none', transformOrigin: 'top left' },
      })
      const link = document.createElement('a')
      link.download = makeDownloadName(values.title)
      link.href = dataUrl
      link.click()
      setMessage('PNG export created.')
    } catch {
      setMessage('PNG export failed. Try again after images finish loading.')
    } finally {
      setIsExporting(false)
    }
  }

  const renderImageControl = (field: ImageField, title: string, description: string) => (
    <Paper
      key={field}
      withBorder
      radius="md"
      p="md"
      className="paste-panel"
      tabIndex={0}
      onPaste={(event) => void handlePaste(event, field)}
    >
      <Stack gap="sm">
        <div>
          <Text fw={700}>{title}</Text>
          <Text size="sm" c="dimmed">
            {description}
          </Text>
        </div>
        {values[field] ? (
          <img className="paste-thumb" src={values[field]} alt={`${title} preview`} />
        ) : (
          <div className="paste-empty">Focus here and paste an image</div>
        )}
        <Group grow>
          <Button variant="light" onClick={() => void readClipboardImage(field)}>
            Paste image
          </Button>
          <Button variant="subtle" color="red" onClick={() => clearImage(field)}>
            Clear
          </Button>
        </Group>
      </Stack>
    </Paper>
  )

  return (
    <AppShell
      navbar={{ width: 400, breakpoint: 'sm' }}
      padding="md"
    >
      <AppShell.Navbar>
        <AppShell.Section p="md">
          <Title order={3}>Flyer designer</Title>
          <Text size="sm" c="dimmed">
            Edit copy, paste images, export PNG.
          </Text>
        </AppShell.Section>

        <AppShell.Section grow component={ScrollArea} px="md">
          <Alert color="blue" variant="light" mb="md">
            {message}
          </Alert>

          <Accordion multiple defaultValue={['copy', 'images']}>
            <Accordion.Item value="copy">
              <Accordion.Control>Flyer copy</Accordion.Control>
              <Accordion.Panel>
                <Stack>
                  <TextInput label="Title" {...form.getInputProps('title')} />
                  <TextInput label="Left subtitle" {...form.getInputProps('subtitleLeft')} />
                  <TextInput label="Right subtitle" {...form.getInputProps('subtitleRight')} />
                  <Textarea
                    label="Info block"
                    autosize
                    minRows={4}
                    {...form.getInputProps('info')}
                  />
                  <ColorInput label="Font color" withEyeDropper {...form.getInputProps('fontColor')} />
                  <PantoneSelect onChange={(c) => form.setFieldValue('fontColor', c)} />
                  <ColorInput label="Background color" {...form.getInputProps('backgroundColor')} />
                  <PantoneSelect onChange={(c) => form.setFieldValue('backgroundColor', c)} />
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="images">
              <Accordion.Control>Images</Accordion.Control>
              <Accordion.Panel>
                <Stack>
                  {renderImageControl(
                    'centerImage',
                    'Center image',
                    'Square or vertical images work best in the middle of the flyer.',
                  )}
                  {renderImageControl(
                    'backgroundImage',
                    'Background image',
                    'A texture or full-bleed image fills the flyer surface.',
                  )}
                  <div>
                    <Text size="sm" fw={500} mb={4}>Background image opacity</Text>
                    <Slider
                      min={0}
                      max={1}
                      step={0.01}
                      {...form.getInputProps('bgImageOpacity')}
                    />
                  </div>
                  <Select
                    label="Background image blend mode"
                    data={[
                      'normal', 'multiply', 'screen', 'overlay',
                      'darken', 'lighten', 'color-dodge', 'color-burn',
                      'hard-light', 'soft-light', 'difference', 'exclusion',
                      'hue', 'saturation', 'color', 'luminosity',
                    ]}
                    {...form.getInputProps('bgImageBlend')}
                  />
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </AppShell.Section>

        <AppShell.Section p="md">
          <Group grow>
            <Button onClick={() => void exportFlyer()} loading={isExporting}>
              Export PNG
            </Button>
            <Button variant="default" onClick={resetFlyer}>
              Reset
            </Button>
          </Group>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <section ref={stageRef} className="preview-stage" aria-label="Flyer preview">
          <div
            ref={previewRef}
            className="flyer-preview"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
              color: values.fontColor,
              backgroundColor: values.backgroundColor,
            }}
          >
            {values.backgroundImage && (
              <div
                className="flyer-bg-image"
                style={{
                  backgroundImage: `url(${values.backgroundImage})`,
                  opacity: values.bgImageOpacity,
                  mixBlendMode: values.bgImageBlend as React.CSSProperties['mixBlendMode'],
                }}
              />
            )}
            <div className="flyer-content">
              <header ref={headerRef} className="flyer-header">
                <h2>{values.title}</h2>
                <div className="flyer-subtitles">
                  <div className="flyer-subtitle-left">{values.subtitleLeft}</div>
                  <div className="flyer-subtitle-right">{values.subtitleRight}</div>
                </div>
              </header>

              <p ref={infoRef} className="flyer-info">{values.info}</p>
            </div>

            <div
              ref={imageFrameRef}
              className="flyer-image-frame"
              style={{ top: imageFrameTop, left: '50%', transform: 'translate(-50%, -50%)' }}
            >
              {values.centerImage ? (
                <img src={values.centerImage} alt="Center flyer visual" />
              ) : (
                <div className="flyer-image-placeholder">Paste center image</div>
              )}
            </div>

            <div
              className="flyer-handle"
              style={{ top: handleTop, left: '50%', transform: 'translate(-50%, -50%)' }}
            >
              konamigxs
            </div>
          </div>
        </section>
      </AppShell.Main>
    </AppShell>
  )
}

export default App
