// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2026, jamgam fork (custom Alpakka Lite features).

import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { InputNumberComponent } from 'components/input_number/input_number'
import { InputToggleComponent } from 'components/input_toggle/input_toggle'
import { WebusbService } from 'services/webusb'
import { ConfigIndex, CtrlGyroStream, GyroSample } from 'lib/ctrl'
import { HID } from 'lib/hid'

// Chart geometry (SVG viewBox units).
const PLOT = {left: 44, right: 432, top: 12, bottom: 155, maxDps: 500}
const TSER = {left: 44, right: 432, top: 12, bottom: 155, slices: 300}
const HIST_BIN_DPS = 20

interface GridLine {y: number, label: string}
interface HistRect {x: number, y: number, w: number, h: number}

@Component({
  selector: 'app-gyro-accel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputNumberComponent,
    InputToggleComponent,
  ],
  templateUrl: './gyro_accel.html',
  styleUrls: ['./gyro_accel.sass']
})
export class GyroAccelComponent {
  // Curve settings. Multipliers stored x10, thresholds stored dps x100
  // (the firmware wire formats).
  enabled = false
  slow = 10
  fast = 20
  tSlow = 0
  tFast = 30000
  loaded = false
  private saveTimer: any

  // Curve chart model.
  PLOT = PLOT
  TSER = TSER
  curvePath = ''
  curveGrid: GridLine[] = []
  histRects: HistRect[] = []
  curveCursorX = -1
  curveDotY = -1
  curveReadout = 'hover the curve'

  // Recording.
  recording = false
  recStatus = 'idle — gyro data is captured only while the gyro is engaged'
  recSummary = ''
  samples: GyroSample[] = []
  lastRecording: GyroSample[] = []
  private t0: number | null = null

  // Time series chart model.
  tsAvailable = false
  tsPath = ''
  tsGrid: GridLine[] = []
  tsTimeTicks: {x: number, label: string}[] = []
  tsThresholds: number[] = []
  tsCursorX = -1
  tsDotY = -1
  tsReadout = 'hover the graph'
  private tsPeaks: (number | null)[] = []
  private tsDuration = 1
  private tsYMax = 100

  constructor(
    private router: Router,
    public webusb: WebusbService,
  ) {}

  ngOnInit() {
    if (!this.webusb.isController()) {
      this.router.navigate(['/'])
      return
    }
    this.load()
  }

  ngOnDestroy() {
    if (this.recording) this.stopRecording()
  }

  async load() {
    const config = await this.webusb.tryGetConfig(ConfigIndex.GYRO_ACCEL_CURVE)
    this.enabled = config.presetIndex > 0
    this.slow = config.values[0] || 10
    this.fast = config.values[1] || 10
    this.tSlow = config.values[2] | (config.values[3] << 8)
    this.tFast = config.values[4] | (config.values[5] << 8)
    this.loaded = true
    this.redrawCurve()
    // Profile names for the active profile indicator.
    this.webusb.selectedDevice?.profiles.fetchProfileNames()
  }

  save() {
    this.redrawCurve()
    this.redrawTimeSeries()
    clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(async () => {
      await this.webusb.trySetConfig(ConfigIndex.GYRO_ACCEL_CURVE, +this.enabled, [
        this.slow,
        this.fast,
        this.tSlow & 0xFF,
        this.tSlow >> 8,
        this.tFast & 0xFF,
        this.tFast >> 8,
      ])
    }, 100)
  }

  activeProfileLabel() {
    const index = this.webusb.getActiveProfile()
    if (index < 0) return ''
    const name = this.webusb.selectedDevice?.profiles.profiles[index]?.meta.name
    return name ? `${index} — ${name}` : `${index}`
  }

  // Multiplier at a given angular speed, mirroring gyro_accel_curve() in the
  // firmware (gyro.c). Speeds in dps, multipliers x10.
  curveAt(dps: number) {
    const tSlow = this.tSlow / 100
    const tFast = this.tFast / 100
    let t
    if (tFast <= tSlow) t = dps >= tSlow ? 1 : 0  // Degenerate: step function.
    else t = Math.min(Math.max((dps - tSlow) / (tFast - tSlow), 0), 1)
    return (this.slow + (this.fast - this.slow) * t) / 10
  }

  private plotX(dps: number) {
    return PLOT.left + (dps / PLOT.maxDps) * (PLOT.right - PLOT.left)
  }

  private yMax() {
    return Math.max(this.slow, this.fast, 10) / 10 * 1.2
  }

  private plotY(mult: number) {
    return PLOT.bottom - (mult / this.yMax()) * (PLOT.bottom - PLOT.top)
  }

  xTickAt(dps: number) {
    return this.plotX(dps)
  }

  redrawCurve() {
    const yTop = this.yMax() / 1.2
    this.curveGrid = [
      {y: this.plotY(0), label: '0'},
      {y: this.plotY(1), label: '1.0'},
      {y: this.plotY(yTop), label: yTop.toFixed(1)},
    ]
    const points: string[] = []
    for (let dps = 0; dps <= PLOT.maxDps; dps += 2) {
      points.push(`${this.plotX(dps).toFixed(1)},${this.plotY(this.curveAt(dps)).toFixed(1)}`)
    }
    this.curvePath = 'M' + points.join(' L')
  }

  onCurveMove(event: MouseEvent) {
    const svg = event.currentTarget as SVGSVGElement
    const rect = svg.getBoundingClientRect()
    const x = (event.clientX - rect.left) * (480 / rect.width)
    const frac = Math.min(Math.max((x - PLOT.left) / (PLOT.right - PLOT.left), 0), 1)
    const dps = frac * PLOT.maxDps
    const mult = this.curveAt(dps)
    this.curveCursorX = this.plotX(dps)
    this.curveDotY = this.plotY(mult)
    this.curveReadout = `${Math.round(dps)}°/s → ${mult.toFixed(2)}× (× sensitivity preset)`
  }

  onCurveLeave() {
    this.curveCursorX = -1
    this.curveReadout = 'hover the curve'
  }

  // Recording -----------------------------------------------------------

  toggleRecording() {
    if (this.recording) this.stopRecording()
    else this.startRecording()
  }

  startRecording() {
    const device = this.webusb.selectedDevice
    if (!device) return
    this.samples = []
    this.t0 = null
    this.recording = true
    this.recStatus = 'recording: waiting for gyro engagement...'
    device.gyroStreamListener = (stream) => this.onStream(stream)
    this.webusb.sendProc(HID.PROC_GYRO_STREAM_START)
  }

  private onStream(stream: CtrlGyroStream) {
    if (!this.recording) return
    if (this.t0 === null) this.t0 = stream.time
    for (const sample of stream.samples) {
      this.samples.push({...sample, t: (sample.t - this.t0) >>> 0})
    }
    const last = this.samples[this.samples.length - 1]
    this.recStatus = `recording: ${this.samples.length} samples, ` +
      `${(last.t / 1e6).toFixed(1)}s, now ${Math.round(last.speed)}°/s`
  }

  stopRecording() {
    this.webusb.sendProc(HID.PROC_GYRO_STREAM_STOP)
    const device = this.webusb.selectedDevice
    if (device) device.gyroStreamListener = undefined
    this.recording = false
    if (!this.samples.length) {
      this.recStatus = 'idle — no samples captured (was the gyro engaged?)'
      return
    }
    this.lastRecording = this.samples
    this.recStatus = 'idle'
    const seconds = this.samples[this.samples.length - 1].t / 1e6
    const speeds = this.samples.map((s) => s.speed).sort((a, b) => a - b)
    const pct = (p: number) => Math.round(speeds[Math.floor((speeds.length - 1) * p)])
    this.recSummary = `${this.samples.length} samples over ${seconds.toFixed(1)}s · ` +
      `speed p50=${pct(0.5)} p90=${pct(0.9)} p99=${pct(0.99)}°/s`
    this.buildHistogram()
    this.buildTimeSeries()
  }

  // Time-at-speed distribution behind the response curve, sharing its x axis.
  private buildHistogram() {
    const bins = new Array(Math.ceil(PLOT.maxDps / HIST_BIN_DPS)).fill(0)
    for (const s of this.lastRecording) {
      bins[Math.min(Math.floor(s.speed / HIST_BIN_DPS), bins.length - 1)]++
    }
    const peak = Math.max(...bins)
    if (!peak) { this.histRects = []; return }
    const width = (PLOT.right - PLOT.left) / bins.length
    this.histRects = bins.flatMap((count: number, i: number) => {
      if (!count) return []
      const h = (count / peak) * (PLOT.bottom - PLOT.top) * 0.9
      return [{x: PLOT.left + i * width + 1, y: PLOT.bottom - h, w: width - 2, h}]
    })
  }

  // Speed-over-time envelope: peak per time slice preserves flicks that a
  // mean would flatten; slices with no samples (gyro disengaged) break the
  // line.
  private buildTimeSeries() {
    const samples = this.lastRecording
    this.tsDuration = Math.max(samples[samples.length - 1].t, 1)
    this.tsPeaks = new Array(TSER.slices).fill(null)
    let maxSpeed = 0
    for (const s of samples) {
      const i = Math.min(Math.floor((s.t / this.tsDuration) * TSER.slices), TSER.slices - 1)
      if (this.tsPeaks[i] === null || s.speed > this.tsPeaks[i]!) this.tsPeaks[i] = s.speed
      if (s.speed > maxSpeed) maxSpeed = s.speed
    }
    this.tsYMax = Math.max(Math.ceil(maxSpeed / 100) * 100, this.tFast / 100, 100)
    this.tsAvailable = true
    this.redrawTimeSeries()
  }

  private tsX(i: number) {
    return TSER.left + ((i + 0.5) / TSER.slices) * (TSER.right - TSER.left)
  }

  private tsY(speed: number) {
    return TSER.bottom - (speed / this.tsYMax) * (TSER.bottom - TSER.top)
  }

  redrawTimeSeries() {
    if (!this.tsAvailable) return
    const ySteps = this.tsYMax <= 300 ? 100 : (this.tsYMax <= 600 ? 200 : 300)
    this.tsGrid = []
    for (let speed = 0; speed <= this.tsYMax; speed += ySteps) {
      this.tsGrid.push({y: this.tsY(speed), label: String(speed)})
    }
    const seconds = this.tsDuration / 1e6
    this.tsTimeTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
      x: TSER.left + f * (TSER.right - TSER.left),
      label: (seconds * f).toFixed(seconds < 20 ? 1 : 0) + 's',
    }))
    this.tsThresholds = !this.enabled ? [] :
      [this.tSlow / 100, this.tFast / 100]
        .filter((t) => t > 0 && t <= this.tsYMax)
        .map((t) => this.tsY(t))
    let d = ''
    let pen = false
    this.tsPeaks.forEach((speed, i) => {
      if (speed === null) { pen = false; return }
      d += (pen ? ' L' : ' M') + this.tsX(i).toFixed(1) + ',' + this.tsY(speed).toFixed(1)
      pen = true
    })
    this.tsPath = d
  }

  onTsMove(event: MouseEvent) {
    if (!this.tsAvailable) return
    const svg = event.currentTarget as SVGSVGElement
    const rect = svg.getBoundingClientRect()
    const x = (event.clientX - rect.left) * (480 / rect.width)
    const frac = Math.min(Math.max((x - TSER.left) / (TSER.right - TSER.left), 0), 1)
    const i = Math.min(Math.floor(frac * TSER.slices), TSER.slices - 1)
    const speed = this.tsPeaks[i]
    const t = (this.tsDuration * (i + 0.5)) / TSER.slices / 1e6
    this.tsCursorX = this.tsX(i)
    if (speed === null) {
      this.tsDotY = -1
      this.tsReadout = `${t.toFixed(2)}s → gyro not engaged`
    } else {
      this.tsDotY = this.tsY(speed)
      this.tsReadout = `${t.toFixed(2)}s → ${Math.round(speed)}°/s peak ` +
        `(curve gives ${this.curveAt(speed).toFixed(2)}×)`
    }
  }

  onTsLeave() {
    this.tsCursorX = -1
    this.tsDotY = -1
    this.tsReadout = 'hover the graph'
  }

  exportCsv() {
    if (!this.lastRecording.length) return
    const rows = ['t_us,speed_dps,accel_mult,out_x,out_y']
    for (const s of this.lastRecording) {
      rows.push(`${s.t},${s.speed},${s.mult},${s.x},${s.y}`)
    }
    const blob = new Blob([rows.join('\n')], {type: 'text/csv'})
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'gyro-recording-' +
      new Date().toISOString().replace(/[:.]/g, '-') + '.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }
}
