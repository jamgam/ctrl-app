// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2026, jamgam fork (custom Alpakka Lite features).

import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { WebusbService } from 'services/webusb'
import { PassthroughButtons, PassthroughExtraButtons } from 'lib/ctrl'

interface ButtonSpec { key: keyof PassthroughButtons, label: string }
interface ExtraButtonSpec { key: keyof PassthroughExtraButtons, label: string }

// Wire order matches the physical layout: left column bottom to top, then
// right column bottom to top (see EXTRA BUTTONS in docs/ctrl_protocol.md).
const EXTRA_BUTTONS: ExtraButtonSpec[] = [
  {key: 'el4', label: 'EL4'},
  {key: 'el3', label: 'EL3'},
  {key: 'el2', label: 'EL2'},
  {key: 'el1', label: 'EL1'},
  {key: 'er3', label: 'ER3'},
  {key: 'er2', label: 'ER2'},
  {key: 'er1', label: 'ER1'},
]

// Input labels follow DS4 naming (what the passthrough gamepad itself calls
// these buttons); output labels follow Alpakka's own profile field naming
// (start/back/mode/capture there are really start_1/select_1/start_2/
// select_2 -- see PassthroughOutput's doc comment in lib/ctrl.ts) since that
// column represents what the profile resolved to, not the DS4 report.
const BUTTONS: ButtonSpec[] = [
  {key: 'dpadUp', label: 'Dpad ↑'},
  {key: 'dpadDown', label: 'Dpad ↓'},
  {key: 'dpadLeft', label: 'Dpad ←'},
  {key: 'dpadRight', label: 'Dpad →'},
  {key: 'a', label: 'A'},
  {key: 'b', label: 'B'},
  {key: 'x', label: 'X'},
  {key: 'y', label: 'Y'},
  {key: 'l1', label: 'L1'},
  {key: 'r1', label: 'R1'},
  {key: 'l2', label: 'L2'},
  {key: 'r2', label: 'R2'},
  {key: 'l3', label: 'L3'},
  {key: 'r3', label: 'R3'},
  {key: 'start', label: 'Start'},
  {key: 'back', label: 'Back'},
  {key: 'mode', label: 'Mode'},
  {key: 'capture', label: 'Capture'},
  {key: 'paddleL', label: 'Paddle L'},
  {key: 'paddleR', label: 'Paddle R'},
]

const OUTPUT_LABELS: Partial<Record<keyof PassthroughButtons, string>> = {
  start: 'Start 1',
  back: 'Select 1',
  mode: 'Start 2',
  capture: 'Select 2',
}
const OUTPUT_BUTTONS: ButtonSpec[] = BUTTONS.map((btn) => (
  OUTPUT_LABELS[btn.key] ? {key: btn.key, label: OUTPUT_LABELS[btn.key]!} : btn
))

@Component({
  selector: 'app-tester',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tester.html',
  styleUrls: ['./tester.sass']
})
export class TesterComponent {
  BUTTONS = BUTTONS
  OUTPUT_BUTTONS = OUTPUT_BUTTONS
  EXTRA_BUTTONS = EXTRA_BUTTONS
  private syncTimer: any
  received = 0

  constructor(
    private router: Router,
    public webusb: WebusbService,
  ) {}

  ngOnInit() {
    if (!this.webusb.isController()) {
      this.router.navigate(['/'])
      return
    }
    // Unlike the gyro stream, this has no on-controller use and nothing to
    // capture while the page is closed, so it is simply on while this page
    // is open and off otherwise -- no manual toggle needed.
    this.webusb.sendPassthroughStream(true)
    this.syncTimer = setInterval(() => this.sync(), 50)
  }

  ngOnDestroy() {
    clearInterval(this.syncTimer)
    this.webusb.sendPassthroughStream(false)
  }

  private sync() {
    this.received = this.webusb.selectedDevice?.passthroughStream.received || 0
  }

  get input() {
    return this.webusb.selectedDevice?.passthroughStream.input || null
  }

  get output() {
    return this.webusb.selectedDevice?.passthroughStream.output || null
  }

  get extraButtons() {
    return this.webusb.selectedDevice?.passthroughStream.extraButtons || null
  }

  get status() {
    if (!this.received) return 'waiting for data — is a passthrough gamepad connected?'
    return `receiving live data (${this.received} packets)`
  }

  pressed(side: 'input' | 'output', key: keyof PassthroughButtons): boolean {
    const source = side == 'input' ? this.input : this.output
    return source ? !!source[key] : false
  }

  extraPressed(key: keyof PassthroughExtraButtons): boolean {
    return this.extraButtons ? !!this.extraButtons[key] : false
  }

  // SVG coordinates for a stick's position dot; y is negated since screen Y
  // grows downward but virtual_y (and the raw axis before it) grows upward.
  stickDot(x: number, y: number) {
    const r = 28
    return {cx: 34 + x * r, cy: 34 - y * r}
  }
}
