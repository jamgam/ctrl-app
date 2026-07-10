// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2026, jamgam fork (custom Alpakka Lite features).

import { Injectable } from '@angular/core'
import { WebusbService } from 'services/webusb'
import { Ctrl, CtrlSection, CtrlExtraButton, CtrlExtraButtons, MessageType } from 'lib/ctrl'

// Undo/redo for profile section edits. Every save records a before/after
// snapshot of the section wire payload; undo/redo restores the snapshot onto
// the live section object (so the UI updates) and writes it to the device.
// Baselines are captured when a section is first shown in the editor, so the
// "before" state is whatever the section looked like prior to the edit.
// History is cleared on every profile page (re)load, since fetching replaces
// the live section objects the entries point at.

interface HistoryEntry {
  profileIndex: number
  section: CtrlSection
  before: number[]
  after: number[]
}

const HISTORY_LIMIT = 100

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private undoStack: HistoryEntry[] = []
  private redoStack: HistoryEntry[] = []
  private baselines = new Map<CtrlSection, number[]>()

  constructor(private webusb: WebusbService) {}

  // Extra button edits are recorded against their whole bank section, since
  // that is the unit that goes over the wire.
  private normalize(section: CtrlSection): CtrlSection {
    if (section instanceof CtrlExtraButton) return section.bank
    return section
  }

  clear() {
    this.undoStack = []
    this.redoStack = []
    this.baselines.clear()
  }

  // Capture the pre-edit state of a section, first time it is seen.
  touch(section: CtrlSection) {
    const target = this.normalize(section)
    if (!this.baselines.has(target)) {
      this.baselines.set(target, target.payload())
    }
  }

  // Called after a mutation was saved: push an entry from the last known
  // baseline to the current state.
  recordChange(profileIndex: number, section: CtrlSection) {
    const target = this.normalize(section)
    const after = target.payload()
    const before = this.baselines.get(target) ?? after
    this.baselines.set(target, after)
    if (JSON.stringify(before) === JSON.stringify(after)) return
    this.undoStack.push({profileIndex, section: target, before, after})
    if (this.undoStack.length > HISTORY_LIMIT) this.undoStack.shift()
    this.redoStack = []
  }

  canUndo() { return this.undoStack.length > 0 }
  canRedo() { return this.redoStack.length > 0 }

  async undo() {
    const entry = this.undoStack.pop()
    if (!entry || !this.webusb.selectedDevice) return
    this.redoStack.push(entry)
    await this.apply(entry, entry.before)
  }

  async redo() {
    const entry = this.redoStack.pop()
    if (!entry || !this.webusb.selectedDevice) return
    this.undoStack.push(entry)
    await this.apply(entry, entry.after)
  }

  private async apply(entry: HistoryEntry, payload: number[]) {
    this.restore(entry.section, payload)
    this.baselines.set(entry.section, [...payload])
    await this.webusb.trySetSection(entry.profileIndex, entry.section)
  }

  // Write a payload snapshot back onto the live section object, by decoding
  // it as if it came from the device and copying the data fields over.
  private restore(section: CtrlSection, payload: number[]) {
    const buffer = new Uint8Array(64)
    buffer[2] = MessageType.SECTION_SHARE
    for (const [i, byte] of payload.entries()) buffer[4 + i] = byte
    const decoded = Ctrl.decode(buffer) as any
    if (!decoded) return
    if (section instanceof CtrlExtraButtons) {
      // Keep the live view objects (selection and editor point at them),
      // only their action groups change.
      for (const [i, view] of section.buttons.entries()) {
        view.actions = decoded.buttons[i].actions
      }
    } else {
      const fields = {...decoded}
      delete fields.protocolFlags
      delete fields.deviceId
      delete fields.messageType
      Object.assign(section, fields)
    }
  }
}
