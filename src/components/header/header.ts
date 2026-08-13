// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2023, Input Labs Oy.

import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router'
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker'
import { interval, Subscription } from 'rxjs';
import { WebusbService } from 'services/webusb'
import { MINUMUM_FIRMWARE_VERSION } from 'lib/version'
import { ConfigIndex } from 'lib/ctrl'
import { Device } from 'lib/device'
import { InputNumberComponent } from 'components/input_number/input_number'


const FW_RELEASES_LINK = 'https://github.com/inputlabs/alpakka_firmware/releases'
const APP_RELEASES_LINK = 'https://github.com/inputlabs/ctrl/releases'
const FIRMWARE_ACK = 'firmware_ack'
const PWA_UPDATE_CHECK_FREQ = 1000 * 60 * 5  // 5 Minutes.

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    InputNumberComponent,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './header.html',
  styleUrls: ['./header.sass']
})
export class HeaderComponent {
  route: string = ''
  dialog: any
  lastRouteForTools = ''
  lastRouteForProfiles = '/profiles/0'
  lastRouteForSettings = '/'
  PWAUpdateAvailable = false
  PWATimerSub!: Subscription
  mouseSensitivityPresets = [
    {index: 2, name: 'High', value: 0},
    {index: 1, name: 'Med', value: 0},
    {index: 0, name: 'Low', value: 0},
  ]
  private mouseSensitivityDevice?: Device
  private mouseSensitivityLoading = false
  private mouseSensitivitySubscription?: Subscription
  mouseSensitivityReady = false
  // Names are only fetched in bulk by the profile page, so the header fetches
  // the one it needs; this tracks what has already been asked for, per device.
  private activeProfileNameFetched = -1
  private activeProfileNameDevice?: Device
  // Template aliases.
  LATEST_FIRMWARE = MINUMUM_FIRMWARE_VERSION
  FW_RELEASES_LINK = FW_RELEASES_LINK
  APP_RELEASES_LINK = APP_RELEASES_LINK

  constructor(
    private router: Router,
    public webusb: WebusbService,
    private swUpdate: SwUpdate,
  ) {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.route = event.urlAfterRedirects
        // Remember route.
        if (this.route.startsWith('/profiles')) {
          this.lastRouteForProfiles = this.route
        }
        if (this.route.startsWith('/settings') || this.route == '/') {
          this.lastRouteForSettings = this.route
        }
        // Check for PWA updates on each router navigation.
        if (this.swUpdate.isEnabled) {
          this.swUpdate.checkForUpdate()
        }
      }
    })
  }

  ngOnInit() {
    this.PWAUpdateWatch()
  }

  PWAUpdateWatch() {
    // Check for new PWA versions regularly (in case no router navigation).
    this.PWATimerSub = interval(PWA_UPDATE_CHECK_FREQ).subscribe(() => {
      if (this.swUpdate.isEnabled) {
        this.swUpdate.checkForUpdate()
      }
    })
    // Subscribe to PWA version changes.
    this.swUpdate.versionUpdates.subscribe(evt => {
      console.log('PWA update event', evt.type, evt)
      if (evt.type === 'VERSION_READY') {
        this.PWAUpdateAvailable = true
      }
    })
  }

  ngOnDestroy() {
    this.PWATimerSub.unsubscribe()
    this.mouseSensitivitySubscription?.unsubscribe()
  }

  ngAfterViewChecked() {
    if (this.shouldWarningFirmware()) this.showDialog('firmware')
  }

  ngDoCheck() {
    this.syncActiveProfileName()
    if (this.webusb.selectedDevice !== this.mouseSensitivityDevice) {
      this.mouseSensitivitySubscription?.unsubscribe()
      this.mouseSensitivityDevice = this.webusb.selectedDevice
      this.mouseSensitivityReady = false
      if (this.mouseSensitivityDevice?.isController()) {
        this.mouseSensitivitySubscription = this.mouseSensitivityDevice.tunes.presetChanged.subscribe((configIndex) => {
          if (configIndex === ConfigIndex.SENS_MOUSE) this.syncMouseSensitivity()
        })
      }
      this.loadMouseSensitivity()
    }
  }

  async loadMouseSensitivity() {
    const device = this.mouseSensitivityDevice
    if (!device || !device.isController() || this.mouseSensitivityLoading) return

    this.mouseSensitivityLoading = true
    try {
      await device.waitUntilReady()
      const preset = await device.tunes.getPreset(ConfigIndex.SENS_MOUSE)
      if (device !== this.mouseSensitivityDevice) return
      this.syncMouseSensitivity()
      this.mouseSensitivityReady = true
    } catch (error) {
      console.warn('Could not load mouse sensitivity presets', error)
    } finally {
      this.mouseSensitivityLoading = false
    }
  }

  syncMouseSensitivity() {
    const preset = this.mouseSensitivityDevice?.tunes.presets[ConfigIndex.SENS_MOUSE]
    if (!preset) return
    for (const quickPreset of this.mouseSensitivityPresets) {
      quickPreset.value = preset.values[quickPreset.index]
    }
  }

  getActiveMouseSensitivity() {
    const preset = this.mouseSensitivityDevice?.tunes.presets[ConfigIndex.SENS_MOUSE]
    return preset?.presetIndex
  }

  isActiveMouseSensitivity(presetIndex: number) {
    return this.getActiveMouseSensitivity() === presetIndex ? 'selected' : ''
  }

  async setMouseSensitivity(presetIndex: number, value?: number) {
    const device = this.mouseSensitivityDevice
    if (!device || !device.isController()) return

    const values = this.mouseSensitivityPresets
      .slice()
      .reverse()
      .map((preset) => preset.value)
    if (value !== undefined) values[presetIndex] = value
    await device.tunes.setPreset(ConfigIndex.SENS_MOUSE, presetIndex, values)
  }

  updateMouseSensitivity(presetIndex: number, value: number) {
    const preset = this.mouseSensitivityPresets.find((item) => item.index === presetIndex)!
    preset.value = value
    this.setMouseSensitivity(presetIndex, value)
  }

  // Profile currently active on the controller, shown in the nav bar. The
  // firmware pushes the index on every switch, but the name lives in the
  // profile's meta section and has to be read once per profile.
  private syncActiveProfileName() {
    const device = this.webusb.selectedDevice
    if (device !== this.activeProfileNameDevice) {
      this.activeProfileNameDevice = device
      this.activeProfileNameFetched = -1
    }
    if (!device || !device.isController()) return
    const index = device.activeProfile
    if (index < 0 || index == this.activeProfileNameFetched) return
    if (device.profiles.getProfile(index).meta.name) {
      this.activeProfileNameFetched = index
      return
    }
    this.activeProfileNameFetched = index
    device.profiles.fetchProfileName(index).catch((error) => {
      console.warn('Could not read the active profile name', error)
      // Let a later pass retry rather than leaving the slot blank forever.
      if (this.activeProfileNameFetched == index) this.activeProfileNameFetched = -1
    })
  }

  getActiveProfileName() {
    const device = this.webusb.selectedDevice
    if (!device || !device.isController()) return ''
    const index = device.activeProfile
    if (index < 0) return ''
    return device.profiles.getProfile(index).meta.name
  }

  // Layer engaged on the controller, blank on the base layer. Numbered as on
  // the profile page, where the base layer is layer 1.
  getActiveLayerLabel() {
    if (this.webusb.getProfileLayers() < 2) return ''
    const layer = this.webusb.getActiveLayer()
    if (!layer) return ''
    return `L${layer + 1}`
  }

  getActiveProfileRoute() {
    return `/profiles/${this.webusb.getActiveProfile()}`
  }

  routeIsSettings() {
    return this.route == '/' || this.route.startsWith('/settings')  ? 'active' : ''
  }

  showDialog(id: string) {
    this.dialog = document.getElementById(`dialog-${id}`)
    this.dialog.showModal()
  }

  hideDialog(): boolean {
    this.dialog.close()
    return true
  }

  firmwareAsNumber(version: number[]) {
    return (version[0] * 1000000) + (version[1] * 1000) + version[2]
  }

  firmwareAsString(version: number[]) {
    return `${version[0]}.${version[1]}.${version[2]}`
  }

  firmwareAck() {
    const fwValue = this.firmwareAsNumber(MINUMUM_FIRMWARE_VERSION).toString()
    localStorage.setItem(FIRMWARE_ACK, fwValue)
  }

  shouldWarningFirmware() {
    // Should display a Forced modal window?.
    if (!this.webusb.isConnectedRaw()) return false
    if (this.webusb.getFirmwareAsString() === '0.0.0') return
    const minimumVersion = this.firmwareAsNumber(MINUMUM_FIRMWARE_VERSION)
    const deviceVersion = this.firmwareAsNumber(this.webusb.getFirmwareVersion())
    const ackVersion = Number(localStorage.getItem(FIRMWARE_ACK))
    if (!deviceVersion) return 0
    return (deviceVersion < minimumVersion) && (ackVersion < minimumVersion)
  }

  shouldNotifyFirmware() {
    // Should notify as an icon in the header?.
    if (!this.webusb.isConnectedRaw()) return false
    if (this.webusb.getFirmwareAsString() === '0.0.0') return
    const minimumVersion = this.firmwareAsNumber(MINUMUM_FIRMWARE_VERSION)
    const deviceVersion = this.firmwareAsNumber(this.webusb.getFirmwareVersion())
    return deviceVersion < minimumVersion
  }

  shouldNotifySerial() {
    if (!this.webusb.selectedDevice) return false
    if (!this.webusb.selectedDevice.isConnected) return false
    if (!this.webusb.selectedDevice.isController()) return false
    return !this.webusb.selectedDevice.canReadSerialNumber()
  }

  pwaRefresh() {
    document.location.reload()
  }
}
