// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2023, Input Labs Oy.

import { Component, Input, Output, EventEmitter } from '@angular/core'
import { CommonModule } from '@angular/common'

const HOLD_DELAY = 500
const REPEAT_INTERVAL = 50

enum Direction {
  UP,
  DOWN,
}

@Component({
  selector: 'app-input-number',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './input_number.html',
  styleUrls: ['./input_number.sass']
})
export class InputNumberComponent {
  @Input() value: number = 0
  @Output() update = new EventEmitter<number>()
  @Input() unit: string = ''
  @Input() min: number = 0
  @Input() max: number = 100
  @Input() step: number = 1
  @Input() decimals: number = 0
  @Input() factor: number = 1
  @Input() offset: number = 0
  @Input() disabled: boolean = false
  @Input() disabledMessage: string = ''
  @Input() editable: boolean = false
  clickTime: number = 0
  timeout: any
  interval: any
  Direction = Direction

  minmax(value: number) {
    const min = (this.min / this.factor) - this.offset
    const max = (this.max / this.factor) - this.offset
    return Math.min(Math.max(value, min), max)
  }

  decrease() {
    const value = this.value - (this.step / this.factor)
    this.value = this.minmax(value)
  }

  increase() {
    const value = this.value + (this.step / this.factor)
    this.value = this.minmax(value)
  }

  save() {
    this.update.emit(this.value)
  }

  // Direct typing (editable mode). The typed value is in display units, and
  // is rounded to the nearest raw unit since raw values are protocol bytes.
  edit(event: Event) {
    const target = event.target as HTMLInputElement
    const typed = Number(target.value)
    if (Number.isNaN(typed)) return
    this.value = this.minmax(Math.round((typed - this.offset) / this.factor))
    target.value = ((this.value * this.factor) + this.offset).toFixed(this.decimals)
    this.save()
  }

  press(dir: Direction) {
    this.clickTime = Date.now()
    this.timeout = setTimeout(() => {
      this.interval = setInterval(() => {
        if (dir == Direction.DOWN) this.decrease()
        if (dir == Direction.UP) this.increase()
      }, REPEAT_INTERVAL)
    }, HOLD_DELAY)
  }

  release(dir: Direction) {
    const delta = Date.now() - this.clickTime
    if (delta < HOLD_DELAY) {
      if (dir == Direction.DOWN) this.decrease()
      if (dir == Direction.UP) this.increase()
    }
    clearTimeout(this.timeout)
    clearInterval(this.interval)
    this.save()
  }
}
