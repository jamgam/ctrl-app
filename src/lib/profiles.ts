// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2023, Input Labs Oy.

/// <reference types="w3c-web-usb" />

import { MessageType, SectionIndex, CtrlGyro, CtrlGyroAxis, CtrlExtraButtons, CtrlExtraButtonsAux } from 'lib/ctrl'
import { profileOf, layerOf, profileIndex } from 'lib/ctrl'
import { Device } from 'lib/device'
import { Profile } from 'lib/profile'
import {
  Ctrl,
  CtrlSectionMeta,
  CtrlButton,
  CtrlRotary,
  CtrlThumbstick,
  CtrlSection,
  ThumbstickMode,
} from 'lib/ctrl'

const NUMBER_OF_PROFILES = 13  // Home + 12 builtin.

export class Profiles {
  device: Device
  // Keyed by profile index, so the layer travels in the high nibble and layer 0
  // keeps its plain 0-12 keys (see lib/ctrl). Sparse on purpose.
  profiles: Profile[] = []
  syncedNames = false
  // Profile indexes whose sections have actually been read from the device. An
  // untouched entry is indistinguishable from a fetched one otherwise, and
  // exporting it would write an empty layer over a real one on re-import.
  fetched = new Set<number>()

  constructor(device: Device) {
    this.device = device
    this.initProfiles()
  }

  async initProfiles() {
    for(let layer of Array(this.device.profileLayers).keys()) {
      for(let i of Array(NUMBER_OF_PROFILES).keys()) {
        this.initProfile(profileIndex(i, layer))
      }
    }
  }

  initProfile(index: number) {
    this.profiles[index] = new Profile()
    this.fetched.delete(index)
    this.syncedNames = false
  }

  // Make sure a profile object exists for an index, which it does not yet if
  // the firmware reported more layers after the initial pass.
  ensureProfile(index: number) {
    if (!this.profiles[index]) this.profiles[index] = new Profile()
    return this.profiles[index]
  }

  async fetchProfileNames() {
    if (this.syncedNames) return
    for(let index of Array(NUMBER_OF_PROFILES).keys()) {
      await this.fetchProfileName(index)
    }
    this.syncedNames = true
  }

  async fetchProfileName(index: number) {
    const section = await this.device.tryGetSection(index, SectionIndex.META)
    this.ensureProfile(index).meta = section as CtrlSectionMeta
  }

  async fetchProfile(profileIndex: number, strict: boolean) {
    const profile = this.ensureProfile(profileIndex)
    // Replace internal meta properties instead of the whole object, so Angular
    // reference to the object is not lost. (Profile name is special because is
    // linked in many dynamic UI elements).
    const meta = await this.device.tryGetSection(profileIndex, SectionIndex.META) as CtrlSectionMeta
    profile.meta.replaceContentsWith(meta)
    // Buttons.
    const getButton = async (sectionIndex: SectionIndex) => {
      return await this.device.tryGetSection(profileIndex, sectionIndex) as CtrlButton
    }
    profile.buttonA = await getButton(SectionIndex.A)
    profile.buttonB = await getButton(SectionIndex.B)
    profile.buttonX = await getButton(SectionIndex.X)
    profile.buttonY = await getButton(SectionIndex.Y)
    profile.buttonDpadLeft = await getButton(SectionIndex.DPAD_LEFT)
    profile.buttonDpadRight = await getButton(SectionIndex.DPAD_RIGHT)
    profile.buttonDpadUp = await getButton(SectionIndex.DPAD_UP)
    profile.buttonDpadDown = await getButton(SectionIndex.DPAD_DOWN)
    profile.buttonSelect1 = await getButton(SectionIndex.SELECT_1)
    profile.buttonSelect2 = await getButton(SectionIndex.SELECT_2)
    profile.buttonStart1 = await getButton(SectionIndex.START_1)
    profile.buttonStart2 = await getButton(SectionIndex.START_2)
    profile.buttonL1 = await getButton(SectionIndex.L1)
    profile.buttonL2 = await getButton(SectionIndex.L2)
    profile.buttonL4 = await getButton(SectionIndex.L4)
    profile.buttonR1 = await getButton(SectionIndex.R1)
    profile.buttonR2 = await getButton(SectionIndex.R2)
    profile.buttonR4 = await getButton(SectionIndex.R4)
    // Left stick.
    profile.buttonLStickLeft = await getButton(SectionIndex.LSTICK_LEFT)
    profile.buttonLStickRight = await getButton(SectionIndex.LSTICK_RIGHT)
    profile.buttonLStickUp = await getButton(SectionIndex.LSTICK_UP)
    profile.buttonLStickDown = await getButton(SectionIndex.LSTICK_DOWN)
    profile.buttonLStickUL = await getButton(SectionIndex.LSTICK_UL)
    profile.buttonLStickUR = await getButton(SectionIndex.LSTICK_UR)
    profile.buttonLStickDL = await getButton(SectionIndex.LSTICK_DL)
    profile.buttonLStickDR = await getButton(SectionIndex.LSTICK_DR)
    profile.buttonLStickPush = await getButton(SectionIndex.LSTICK_PUSH)
    profile.buttonLStickInner = await getButton(SectionIndex.LSTICK_INNER)
    profile.buttonLStickOuter = await getButton(SectionIndex.LSTICK_OUTER)
    // Right stick (thumbstick or dhat).
    profile.buttonRStickLeft = await getButton(SectionIndex.RSTICK_LEFT)
    profile.buttonRStickRight = await getButton(SectionIndex.RSTICK_RIGHT)
    profile.buttonRStickUp = await getButton(SectionIndex.RSTICK_UP)
    profile.buttonRStickDown = await getButton(SectionIndex.RSTICK_DOWN)
    profile.buttonRStickUL = await getButton(SectionIndex.RSTICK_UL)
    profile.buttonRStickUR = await getButton(SectionIndex.RSTICK_UR)
    profile.buttonRStickDL = await getButton(SectionIndex.RSTICK_DL)
    profile.buttonRStickDR = await getButton(SectionIndex.RSTICK_DR)
    profile.buttonRStickPush = await getButton(SectionIndex.RSTICK_PUSH)
    // Rotary.
    const rotaryUp = await this.device.tryGetSection(profileIndex, SectionIndex.ROTARY_UP) as CtrlRotary
    const rotaryDown = await this.device.tryGetSection(profileIndex, SectionIndex.ROTARY_DOWN) as CtrlRotary
    profile.rotaryUp = rotaryUp
    profile.rotaryDown = rotaryDown
    // Thumbstick mode.
    const lStick = await this.device.tryGetSection(profileIndex, SectionIndex.LSTICK_SETTINGS) as CtrlThumbstick
    const rStick = await this.device.tryGetSection(profileIndex, SectionIndex.RSTICK_SETTINGS) as CtrlThumbstick
    profile.settingsLStick = lStick
    profile.settingsRStick = rStick
    // Gyro mode.
    const gyro = await this.device.tryGetSection(profileIndex, SectionIndex.GYRO_SETTINGS) as CtrlGyro
    profile.settingsGyro = gyro
    // Gyro Axes.
    profile.gyroX = await this.device.tryGetSection(profileIndex, SectionIndex.GYRO_X) as CtrlGyroAxis
    profile.gyroY = await this.device.tryGetSection(profileIndex, SectionIndex.GYRO_Y) as CtrlGyroAxis
    profile.gyroZ = await this.device.tryGetSection(profileIndex, SectionIndex.GYRO_Z) as CtrlGyroAxis
    // Extra (modded) buttons, custom firmware extension. The aux companion
    // section carries their hold/double action groups.
    profile.extraButtons = await this.device.tryGetSection(
      profileIndex, SectionIndex.EXTRA_BUTTONS) as CtrlExtraButtons
    const extraAux = await this.device.tryGetSection(
      profileIndex, SectionIndex.EXTRA_BUTTONS_AUX) as CtrlExtraButtonsAux
    profile.extraButtons.applyAux(extraAux)
    this.fetched.add(profileIndex)
  }

  // Read any layer of this profile that has not been read yet, so operations
  // covering the whole profile do not work off placeholder data. The layer on
  // screen is already fetched, so its live section objects are left alone.
  async fetchMissingLayers(index: number) {
    const base = profileOf(index)
    for(let layer=0; layer<this.device.profileLayers; layer++) {
      const target = profileIndex(base, layer)
      if (this.fetched.has(target)) continue
      await this.fetchProfile(target, false)
    }
  }

  getProfile(profileIndex: number) {
    return this.ensureProfile(profileIndex)
  }

  // A saved profile carries every layer, so exporting and re-importing does not
  // silently drop layer bindings. A stored section is 60 bytes but only 59 are
  // used (section index plus 58 data bytes), so the layer rides in the spare
  // trailing byte: files written before layers existed have a zero there, which
  // reads back as the base layer.
  async saveToBlob(index: number) {
    const base = profileOf(index)
    await this.fetchMissingLayers(index)
    const data:number[] = []
    for(let layer=0; layer<this.device.profileLayers; layer++) {
      const profile = this.profiles[profileIndex(base, layer)]
      if (!profile) continue
      for(const section of profile.getSections()) {
        const sectionBinary = new Uint8Array(60)
        const payload = section.payload().slice(1)  // Remove profile index.
        for (let [i, value] of payload.entries()) {
          sectionBinary[i] = value
        }
        sectionBinary[59] = layer
        data.push(...sectionBinary)
      }
    }
    return new Uint8Array(data)
  }

  async loadFromBlob(index: number, data: Uint8Array) {
    const base = profileOf(index)
    let sections: CtrlSection[] = []
    for(let i=0; i<data.length; i+=60) {
      const rawData = data.slice(i, i+60)
      const layer = rawData[59]
      // rawData still ends with the layer marker, which lands past the last
      // decoded byte of the section and is ignored.
      const sectionData = [
        0,
        0,
        MessageType.SECTION_SHARE,
        0,
        profileIndex(base, layer),
        ...rawData,
      ]
      const section = Ctrl.decode(new Uint8Array(sectionData)) as CtrlSection
      sections.push(section)
    }
    sections = this.upgradeFrom097(sections)
    for(let section of sections) {
      console.log('Section from blob', section)
      await this.device.trySetSection(section.profileIndex, section)
    }
    for(let layer=0; layer<this.device.profileLayers; layer++) {
      this.fetchProfile(profileIndex(base, layer), true)
    }
  }

  upgradeFrom097(sections: CtrlSection[]): CtrlSection[] {
    // Only the base layer is inspected: a file old enough to need this upgrade
    // predates layers, so everything in it is base layer anyway, and counting
    // sections across layers would misjudge what the file contains.
    const base = sections.filter((s) => layerOf(s.profileIndex) == 0)
    // Bump profile version.
    const meta = base.find(s => s instanceof CtrlSectionMeta) as CtrlSectionMeta
    meta.versionMajor = 1
    meta.versionMinor = 1
    meta.versionPatch = 0
    // Inject default right stick settings if not defined.
    // (Default made to resemble digital 8-dir as in old controllers).
    const hasRightThumbstick = (
      base
      .filter((section => section instanceof CtrlThumbstick))
      .length == 2
    )
    if (!hasRightThumbstick) {
      const rStickSection = new CtrlThumbstick(
        base[0].profileIndex,
        SectionIndex.RSTICK_SETTINGS,
        ThumbstickMode.DIR8,
        false,  // Distance mode / Ignore misalignment.
        60,  // Deadzone.
        50,  // Axis overlap (unsigned to signed).
        true,  // Deadzone override.
        0, // Antideadzone.
        70, // Saturation.
        80,  // Outer threshold.
        false,  // Push auto-toggle.
        100,  // Sens mouse.
        10,  // Sens scroll.
        100,  // Sens Y ratio.
        0,  // Accel.
        0,  // Rotation center deadzone.
        0,  // Rotation entry deadzone.
        false,  // Rotation anti-clockwise.
        false,  // Rotation absolute mode
        false,  // Rotation RWS enabled.
        0,  // Rotation RWS.
        0,  // Rotation sens axis.
        0,  // Rotation smoothing.
        0,  // Rotation flick time.
        false,  // Rotation keep value.
      )
      sections.push(rStickSection)
    }
    return sections
  }
}
