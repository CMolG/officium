// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- a consumer without next/image-types (the ui package) needs these ambient modules; an import cannot carry a .d.ts
/// <reference path="./image-modules.d.ts" />
/*
 * images.ts: the 91 drawings as static imports, so Next fingerprints each file and serves it from
 * the CDN prefix like any other asset. The only place in the package that touches the files; the
 * names, meanings and alt texts live in catalog.ts, which imports no image.
 *
 * Adding a drawing: export it with `scripts/export-doodles.mjs` into ./webp and ./png, add it to
 * catalog.ts, and add its two lines here. `doodles.test.ts` fails while any of the three disagrees with the folder.
 */
import type { DoodleName } from "./catalog";
import type { ImageModule } from "./image-module";

import amazed from "./webp/amazed.webp";
import artistGreeting from "./webp/artist_greeting.webp";
import artistReady from "./webp/artist_ready.webp";
import artistShy from "./webp/artist_shy.webp";
import artistSigh from "./webp/artist_sigh.webp";
import artistStunned from "./webp/artist_stunned.webp";
import artistThinking from "./webp/artist_thinking.webp";
import artistWorried from "./webp/artist_worried.webp";
import astronautGreeting from "./webp/astronaut_greeting.webp";
import astronautReady from "./webp/astronaut_ready.webp";
import baristaGreeting from "./webp/barista_greeting.webp";
import baristaReady from "./webp/barista_ready.webp";
import builderGreeting from "./webp/builder_greeting.webp";
import builderReady from "./webp/builder_ready.webp";
import chefGreeting from "./webp/chef_greeting.webp";
import chefReady from "./webp/chef_ready.webp";
import clap from "./webp/clap.webp";
import confident from "./webp/confident.webp";
import courierGreeting from "./webp/courier_greeting.webp";
import courierReady from "./webp/courier_ready.webp";
import cry from "./webp/cry.webp";
import developerGreeting from "./webp/developer_greeting.webp";
import developerReady from "./webp/developer_ready.webp";
import dislike from "./webp/dislike.webp";
import dizzy from "./webp/dizzy.webp";
import doctorGreeting from "./webp/doctor_greeting.webp";
import doctorReady from "./webp/doctor_ready.webp";
import eager from "./webp/eager.webp";
import facepalm from "./webp/facepalm.webp";
import firefighterGreeting from "./webp/firefighter_greeting.webp";
import firefighterReady from "./webp/firefighter_ready.webp";
import gardenerGreeting from "./webp/gardener_greeting.webp";
import gardenerReady from "./webp/gardener_ready.webp";
import glad from "./webp/glad.webp";
import grumpy from "./webp/grumpy.webp";
import hairdresserGreeting from "./webp/hairdresser_greeting.webp";
import hairdresserReady from "./webp/hairdresser_ready.webp";
import huh from "./webp/huh.webp";
import idea from "./webp/idea.webp";
import judgeGreeting from "./webp/judge_greeting.webp";
import judgeReady from "./webp/judge_ready.webp";
import laugh from "./webp/laugh.webp";
import lifeguardGreeting from "./webp/lifeguard_greeting.webp";
import lifeguardReady from "./webp/lifeguard_ready.webp";
import like from "./webp/like.webp";
import love from "./webp/love.webp";
import mechanicGreeting from "./webp/mechanic_greeting.webp";
import mechanicReady from "./webp/mechanic_ready.webp";
import mug from "./webp/mug.webp";
import nurseGreeting from "./webp/nurse_greeting.webp";
import nurseReady from "./webp/nurse_ready.webp";
import oh from "./webp/oh.webp";
import okay from "./webp/okay.webp";
import oops from "./webp/oops.webp";
import peace from "./webp/peace.webp";
import phew from "./webp/phew.webp";
import photographerGreeting from "./webp/photographer_greeting.webp";
import photographerReady from "./webp/photographer_ready.webp";
import pilotGreeting from "./webp/pilot_greeting.webp";
import pilotReady from "./webp/pilot_ready.webp";
import point from "./webp/point.webp";
import policeGreeting from "./webp/police_greeting.webp";
import policeReady from "./webp/police_ready.webp";
import refereeGreeting from "./webp/referee_greeting.webp";
import refereeReady from "./webp/referee_ready.webp";
import reporterGreeting from "./webp/reporter_greeting.webp";
import reporterReady from "./webp/reporter_ready.webp";
import salute from "./webp/salute.webp";
import scientistGreeting from "./webp/scientist_greeting.webp";
import scientistReady from "./webp/scientist_ready.webp";
import shh from "./webp/shh.webp";
import shrug from "./webp/shrug.webp";
import sleepy from "./webp/sleepy.webp";
import stop from "./webp/stop.webp";
import streamerGreeting from "./webp/streamer_greeting.webp";
import streamerReady from "./webp/streamer_ready.webp";
import strong from "./webp/strong.webp";
import teacherGreeting from "./webp/teacher_greeting.webp";
import teacherReady from "./webp/teacher_ready.webp";
import thanks from "./webp/thanks.webp";
import think from "./webp/think.webp";
import trainerGreeting from "./webp/trainer_greeting.webp";
import trainerReady from "./webp/trainer_ready.webp";
import vacation from "./webp/vacation.webp";
import waiterGreeting from "./webp/waiter_greeting.webp";
import waiterReady from "./webp/waiter_ready.webp";
import wave from "./webp/wave.webp";
import wink from "./webp/wink.webp";
import worried from "./webp/worried.webp";
import wow from "./webp/wow.webp";
import yay from "./webp/yay.webp";

export const DOODLE_IMAGES: Record<DoodleName, ImageModule> = {
  amazed: amazed,
  artist_greeting: artistGreeting,
  artist_ready: artistReady,
  artist_shy: artistShy,
  artist_sigh: artistSigh,
  artist_stunned: artistStunned,
  artist_thinking: artistThinking,
  artist_worried: artistWorried,
  astronaut_greeting: astronautGreeting,
  astronaut_ready: astronautReady,
  barista_greeting: baristaGreeting,
  barista_ready: baristaReady,
  builder_greeting: builderGreeting,
  builder_ready: builderReady,
  chef_greeting: chefGreeting,
  chef_ready: chefReady,
  clap: clap,
  confident: confident,
  courier_greeting: courierGreeting,
  courier_ready: courierReady,
  cry: cry,
  developer_greeting: developerGreeting,
  developer_ready: developerReady,
  dislike: dislike,
  dizzy: dizzy,
  doctor_greeting: doctorGreeting,
  doctor_ready: doctorReady,
  eager: eager,
  facepalm: facepalm,
  firefighter_greeting: firefighterGreeting,
  firefighter_ready: firefighterReady,
  gardener_greeting: gardenerGreeting,
  gardener_ready: gardenerReady,
  glad: glad,
  grumpy: grumpy,
  hairdresser_greeting: hairdresserGreeting,
  hairdresser_ready: hairdresserReady,
  huh: huh,
  idea: idea,
  judge_greeting: judgeGreeting,
  judge_ready: judgeReady,
  laugh: laugh,
  lifeguard_greeting: lifeguardGreeting,
  lifeguard_ready: lifeguardReady,
  like: like,
  love: love,
  mechanic_greeting: mechanicGreeting,
  mechanic_ready: mechanicReady,
  mug: mug,
  nurse_greeting: nurseGreeting,
  nurse_ready: nurseReady,
  oh: oh,
  okay: okay,
  oops: oops,
  peace: peace,
  phew: phew,
  photographer_greeting: photographerGreeting,
  photographer_ready: photographerReady,
  pilot_greeting: pilotGreeting,
  pilot_ready: pilotReady,
  point: point,
  police_greeting: policeGreeting,
  police_ready: policeReady,
  referee_greeting: refereeGreeting,
  referee_ready: refereeReady,
  reporter_greeting: reporterGreeting,
  reporter_ready: reporterReady,
  salute: salute,
  scientist_greeting: scientistGreeting,
  scientist_ready: scientistReady,
  shh: shh,
  shrug: shrug,
  sleepy: sleepy,
  stop: stop,
  streamer_greeting: streamerGreeting,
  streamer_ready: streamerReady,
  strong: strong,
  teacher_greeting: teacherGreeting,
  teacher_ready: teacherReady,
  thanks: thanks,
  think: think,
  trainer_greeting: trainerGreeting,
  trainer_ready: trainerReady,
  vacation: vacation,
  waiter_greeting: waiterGreeting,
  waiter_ready: waiterReady,
  wave: wave,
  wink: wink,
  worried: worried,
  wow: wow,
  yay: yay,
};
