// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2023, Input Labs Oy.

import { Device } from 'lib/device'
import { Subject } from 'rxjs'

export interface PresetWithValues {
  presetIndex: number,
  values: number[],
}

export class Tunes {
  device: Device
  presets: PresetWithValues[]
  presetChanged = new Subject<number>()

  constructor(device: Device) {
    this.device = device
    this.presets = []
  }

  async fetchPreset(configIndex: number) {
    const presetWithValues = await this.device.tryGetConfig(configIndex)
    this.presets[configIndex] = presetWithValues
    this.presetChanged.next(configIndex)
  }

  async getPreset(configIndex: number) {
    if (this.presets[configIndex] === undefined) {
      await this.fetchPreset(configIndex)
    }
    return this.presets[configIndex]
  }

  async setPreset(configIndex: number, presetIndex: number, values: number[]) {
    this.presets[configIndex] = {presetIndex, values}
    const result = await this.device.trySetConfig(configIndex, presetIndex, values)
    this.presetChanged.next(configIndex)
    return result
  }

  async invalidatePresets() {
    for(let configIndex in this.presets) {
      await this.fetchPreset(Number(configIndex))
    }
  }

}
