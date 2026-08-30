// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2023, Input Labs Oy.

import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { WebusbService } from 'services/webusb'
import { HID } from 'lib/hid'
import { ConfigIndex, LogMask } from 'lib/ctrl'

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './logs.html',
  styleUrls: ['./logs.sass']
})
export class LogsComponent {
  public HID = HID  // Template alias.
  dialogCalibrate: any
  dialogResetFactory: any
  dialogResetConfig: any
  dialogResetProfiles: any
  dialogForget: any
  filterDebug: boolean = false
  filterUSB: boolean = false
  filterTouch: boolean = false
  filterWireless: boolean = false
  filterPassthrough: boolean = false

  constructor(
    public webusb: WebusbService
  ) {}

  ngAfterViewInit() {
    this.dialogCalibrate = document.getElementById('dialog-calibrate')
    this.dialogResetConfig = document.getElementById('dialog-reset-config')
    this.dialogResetProfiles = document.getElementById('dialog-reset-profiles')
    this.dialogResetFactory = document.getElementById('dialog-reset-factory')
    this.dialogForget = document.getElementById('dialog-forget')
    this.filterGet()
  }

  downloadLogs() {
    if (this.webusb.getLogs().length == 0) return
    let logs = [...this.webusb.getLogs()]
    logs.reverse()
    const data = logs.join('')
    const blob = new Blob([data], {type: 'text/plain'})
    const a = document.createElement('a')
    document.body.appendChild(a)
    // a.style = 'display: none'
    a.href = URL.createObjectURL(blob)
    a.download = 'alpakka_logs.txt'
    a.click()
    URL.revokeObjectURL(a.href)
    a.remove()
  }

  filterToggle(name: string) {
    if (name == 'debug') this.filterDebug = !this.filterDebug
    if (name == 'usb') this.filterUSB = !this.filterUSB
    if (name == 'touch') this.filterTouch = !this.filterTouch
    if (name == 'wireless') this.filterWireless = !this.filterWireless
    if (name == 'passthrough') this.filterPassthrough = !this.filterPassthrough
    this.filterSet()
  }

  async filterGet() {
    const config = await this.webusb.tryGetConfig(ConfigIndex.LOG_MASK)
    this.filterUSB = !!(config.presetIndex & LogMask.USB)
    this.filterTouch = !!(config.presetIndex & LogMask.TOUCH)
    this.filterWireless = !!(config.presetIndex & LogMask.WIRELESS)
    this.filterPassthrough = !!(config.presetIndex & LogMask.PASSTHROUGH)
  }

  filterSet() {
    let logMask: LogMask = LogMask.BASIC
    if (this.filterUSB) logMask += LogMask.USB
    if (this.filterTouch) logMask += LogMask.TOUCH
    if (this.filterWireless) logMask += LogMask.WIRELESS
    if (this.filterPassthrough) logMask += LogMask.PASSTHROUGH
    this.webusb.trySetConfig(ConfigIndex.LOG_MASK, logMask, [])
  }
}
