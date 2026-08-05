// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2023, Input Labs Oy.

import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router, ActivatedRoute } from '@angular/router'
import { Subscription } from 'rxjs'
import { LedComponent } from 'components/led/led'
import { InputNumberComponent } from 'components/input_number/input_number'
import { WebusbService } from 'services/webusb'
import { ConfigIndex } from 'lib/ctrl'
import { Device } from 'lib/device'

interface Modes  {
  [key: string]: Mode
}

interface Mode {
  url: string,
  title: string,
  unit: string,
  min: number,
  max: number,
  step: number,
  decimals?: number,
  factor?: number,
  displayReversed: boolean,
  configIndex: ConfigIndex,
  presets: Preset[]
}

interface Preset {
  index: number,
  name: string,
  desc: string,
  value?: number,
  fixed?: string,
  invalid?: boolean,
  leds: number,
  blink: number,
  readonly?: boolean,
  hidden?: boolean,
}

@Component({
  selector: 'app-tune',
  standalone: true,
  imports: [
    CommonModule,
    LedComponent,
    InputNumberComponent,
  ],
  templateUrl: './tune.html',
  styleUrls: ['./tune.sass']
})
export class TuneComponent {
  device?: Device
  modes: Modes = modes
  mode: Mode
  title: string = ''
  dialogProtocol: any
  dialogProtocolConfirmFunc: any
  presetSubscription?: Subscription

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    public webusb: WebusbService,
  ) {
    this.mode = this.modes['protocol']  // Default to avoid compiler complains.
    activatedRoute.data.subscribe((data) => {
      this.mode = this.modes[data['mode'] as string]
    })
  }

  ngOnInit() {
    if (!this.webusb.selectedDevice) return
    this.device = this.webusb.selectedDevice
    this.presetSubscription = this.device.tunes.presetChanged.subscribe((configIndex) => {
      if (configIndex === this.mode.configIndex) this.syncPresetValues()
    })
    // Avoid tune options not in dongle.
    if (this.webusb.isDongle()) {
      if (['protocol', 'mouse_sens', 'touch_sens', 'deadzone'].includes(this.mode.url)) {
        this.router.navigate(['/'])
      }
    }
    this.init()
  }

  ngOnDestroy() {
    this.presetSubscription?.unsubscribe()
  }

  async init() {
    // Wait until the device is ready.
    await this.device!.waitUntilReady()
    // Fetch.
    await this.getPreset()
  }

  getPresets() {
    if (this.mode.displayReversed) return this.mode.presets.slice().reverse()
    else return this.mode.presets
  }

  async getPreset() {
    // console.log(`getPreset ${ConfigIndex[this.mode.configIndex]}`)
    const tunes = this.webusb.selectedDevice!.tunes
    await tunes.getPreset(this.mode.configIndex)
    this.syncPresetValues()
  }

  syncPresetValues() {
    if (this.mode.url == 'protocol' || !this.device) return
    const presetWithValues = this.device.tunes.presets[this.mode.configIndex]
    if (!presetWithValues) return
    for (let [index, preset] of this.mode.presets.entries()) {
      preset.value = presetWithValues.values[index]
    }
  }

  setPresetConfirm(preset: Preset) {
    if (this.mode.configIndex == ConfigIndex.PROTOCOL) {
      this.dialogProtocolConfirmFunc = () => this.setPreset(preset)
      this.showDialogProtocol()
    }
    else this.setPreset(preset)
  }

  async setPreset(preset: Preset) {
    const tunes = this.webusb.selectedDevice!.tunes
    const presetIndex = await tunes.setPreset(
      this.mode.configIndex,
      preset.index,
      this.mode.presets.map((preset) => preset.value as number),
    )
  }

  setValue(preset:Preset, value: number) {
    preset.value = value
    this.setPreset(preset)
  }

  getActive() {
    const tunes = this.webusb.selectedDevice!.tunes
    const preset = tunes.presets[this.mode.configIndex]
    if (preset === undefined) return undefined
    const presetIndex = preset!.presetIndex
    return this.mode.presets.filter((preset) => preset.index === presetIndex).pop() as Preset
  }

  isActive(preset: Preset) {
    return preset === this.getActive() ? 'selected' : ''
  }

  showDialogProtocol() {
    this.dialogProtocol = document.getElementById('dialog-protocol')
    this.dialogProtocol.showModal()
  }

  hideDialogProtocol(): boolean {
    this.dialogProtocol.close()
    return true
  }

  confirmDialogProtocol() {
    this.dialogProtocolConfirmFunc()
  }
}

const modes: Modes = {
  protocol: {
    configIndex: ConfigIndex.PROTOCOL,
    url: 'protocol',
    title: 'Communication protocol',
    unit: '',
    min: 0,
    max: 0,
    step: 0,
    displayReversed: false,
    presets: [
      {index: 0, name: 'Windows', desc:'',                fixed:'XInput', leds:0b0001, blink:0b1000, readonly:true},
      {index: 1, name: 'Linux',   desc:'and Steam Deck',  fixed:'XPad',   leds:0b0001, blink:0b0100, readonly:true},
      {index: 2, name: 'Generic', desc:'aka DirectInput', fixed:'HID',    leds:0b0001, blink:0b0010, readonly:true},
    ]
  },
  touch_sens: {
    configIndex: ConfigIndex.SENS_TOUCH,
    url: 'touch_sens',
    title: 'Touch sensitivity',
    unit: 'μs',
    min: 0,
    max: 25,
    step: 0.1,
    factor: 0.1,
    decimals: 1,
    displayReversed: true,
    presets: [
      {index: 0, name: 'Auto low',  desc: 'More stable',     leds:0b0010, blink:0b0100, hidden:true},
      {index: 1, name: 'Auto mid',  desc: 'Default',         leds:0b0010, blink:0b1000, hidden:true},
      {index: 2, name: 'Auto high', desc: 'More responsive', leds:0b0010, blink:0b0001, hidden:true},
      {index: 3, name: 'Custom 2',  desc: '',                leds:0b0010, blink:0b1100},
      {index: 4, name: 'Custom 1',  desc: '',                leds:0b0010, blink:0b1001},
    ]
  },
  mouse_sens: {
    configIndex: ConfigIndex.SENS_MOUSE,
    url: 'mouse_sens',
    title: 'Mouse sensitivity',
    unit: 'DPI',
    min: 80,
    max: 4000,
    step: 80,
    factor: 80,
    decimals: 0,
    displayReversed: true,
    presets: [
      {index: 0, name: 'Low',  desc: 'Recommended for 1080p', leds:0b0100, blink:0b1000},
      {index: 1, name: 'Mid',  desc: 'Recommended for 1440p', leds:0b0100, blink:0b0001},
      {index: 2, name: 'High', desc: 'Recommended for 4K',    leds:0b0100, blink:0b0010},
    ]
  },
  deadzone: {
    configIndex: ConfigIndex.DEADZONE,
    url: 'deadzone',
    title: 'Thumbstick deadzone',
    unit: '%',
    min: 0,
    max: 99,
    step: 1,
    displayReversed: true,
    presets: [
      {index: 0, name: 'Low',  desc: 'Smaller center radius', leds:0b1000, blink:0b0100},
      {index: 1, name: 'Mid',  desc: '',                      leds:0b1000, blink:0b0010},
      {index: 2, name: 'High', desc: 'Bigger center radius',  leds:0b1000, blink:0b0001},
    ]
  }
}
