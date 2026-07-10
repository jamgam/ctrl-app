// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2026, jamgam fork (custom Alpakka Lite features).

import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { InputNumberComponent } from 'components/input_number/input_number'
import { WebusbService } from 'services/webusb'
import { ConfigIndex, CtrlSectionMeta } from 'lib/ctrl'

const NUMBER_OF_PROFILES = 13  // Home + 12 builtin.

@Component({
  selector: 'app-scroll',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputNumberComponent,
  ],
  templateUrl: './scroll.html',
  styleUrls: ['./scroll.sass']
})
export class ScrollComponent {
  // Global settings (SCROLL_BUTTONS config): mode 0=flick, 1=single trigger.
  mode = 0
  notches = 7
  minMs = 50
  maxMs = 70
  loaded = false
  metasLoaded = false
  overrideNames = ['Use global', 'Single trigger', 'Flick']
  profileIndexes = Array.from({length: NUMBER_OF_PROFILES}, (_, i) => i)
  private saveTimer: any

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

  async load() {
    const config = await this.webusb.tryGetConfig(ConfigIndex.SCROLL_BUTTONS)
    this.mode = config.presetIndex
    this.notches = config.values[0] || 7
    this.minMs = config.values[1] || 50
    this.maxMs = config.values[2] || 70
    this.loaded = true
    // Per-profile overrides live in each profile's meta section.
    await this.webusb.selectedDevice!.profiles.fetchProfileNames()
    this.metasLoaded = true
  }

  save() {
    // Keep the flick duration window ordered.
    if (this.maxMs < this.minMs) this.maxMs = this.minMs
    clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(async () => {
      await this.webusb.trySetConfig(ConfigIndex.SCROLL_BUTTONS, this.mode,
        [this.notches, this.minMs, this.maxMs])
    }, 100)
  }

  setMode(mode: number) {
    this.mode = mode
    this.save()
  }

  getMeta(index: number): CtrlSectionMeta | undefined {
    return this.webusb.selectedDevice?.profiles.profiles[index]?.meta
  }

  profileName(index: number) {
    if (index === 0) return 'Home'
    return this.getMeta(index)?.name || `Profile ${index}`
  }

  getOverride(index: number) {
    const override = this.getMeta(index)?.scrollOverride ?? 0
    return override <= 2 ? override : 0
  }

  async setOverride(index: number, value: string) {
    const meta = this.getMeta(index)
    if (!meta) return
    meta.scrollOverride = Number(value)
    // Meta writes are full-section (read-modify-write), names and versions
    // are already in the fetched meta object.
    await this.webusb.trySetSection(index, meta)
  }

  isActive(index: number) {
    return this.webusb.getActiveProfile() === index
  }
}
