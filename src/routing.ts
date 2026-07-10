// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2023, Input Labs Oy.

import { Routes } from '@angular/router'
import { LogsComponent } from 'components/logs/logs'
import { WipComponent } from 'components/wip/wip'
import { TuneComponent } from 'components/tune/tune'
import { SettingsComponent } from 'components/settings/settings'
import { GyroAccelComponent } from 'components/gyro_accel/gyro_accel'
import { ScrollComponent } from 'components/scroll/scroll'
import { ProfileComponent } from 'components/profile/profile'
import { HelpWindowsComponent } from 'components/help/help_windows'
import { HelpLinuxComponent } from 'components/help/help_linux'
import { HelpDeckComponent } from 'components/help/help_deck'
import { HelpPrivacyComponent } from 'components/help/help_privacy'
import { HelpPWAComponent } from 'components/help/help_pwa'

export const routes: Routes = [
  {path: '', component: LogsComponent},
  {path: 'settings/protocol', component: TuneComponent, data: {mode:'protocol'}},
  {path: 'settings/deadzone', component: TuneComponent, data: {mode:'deadzone'}},
  {path: 'settings/touch_sens', component: TuneComponent, data: {mode:'touch_sens'}},
  {path: 'settings/mouse_sens', component: TuneComponent, data: {mode:'mouse_sens'}},
  {path: 'settings/gyro_accel', component: GyroAccelComponent},
  {path: 'settings/scroll', component: ScrollComponent},
  {path: 'settings/advanced', component: SettingsComponent},
  {path: 'settings/app', component: WipComponent},
  {path: 'settings/tester', component: WipComponent},
  {path: 'settings/fw_update', component: WipComponent},
  {path: 'profiles/0', component: ProfileComponent, data: {index:0}},
  {path: 'profiles/1', component: ProfileComponent, data: {index:1}},
  {path: 'profiles/2', component: ProfileComponent, data: {index:2}},
  {path: 'profiles/3', component: ProfileComponent, data: {index:3}},
  {path: 'profiles/4', component: ProfileComponent, data: {index:4}},
  {path: 'profiles/5', component: ProfileComponent, data: {index:5}},
  {path: 'profiles/6', component: ProfileComponent, data: {index:6}},
  {path: 'profiles/7', component: ProfileComponent, data: {index:7}},
  {path: 'profiles/8', component: ProfileComponent, data: {index:8}},
  {path: 'profiles/9', component: ProfileComponent, data: {index:9}},
  {path: 'profiles/10', component: ProfileComponent, data: {index:10}},
  {path: 'profiles/11', component: ProfileComponent, data: {index:11}},
  {path: 'profiles/12', component: ProfileComponent, data: {index:12}},
  {path: 'help/windows', component: HelpWindowsComponent},
  {path: 'help/linux', component: HelpLinuxComponent},
  {path: 'help/deck', component: HelpDeckComponent},
  {path: 'help/pwa', component: HelpPWAComponent},
  {path: 'help/privacy', component: HelpPrivacyComponent},
  // Redirects
  {path: 'profiles', redirectTo: '/profiles/0', pathMatch: 'full' },
  {path: 'settings', redirectTo: '/', pathMatch: 'full' },
  {path: 'help', redirectTo: '/help/windows', pathMatch: 'full' },
]
