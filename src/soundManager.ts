import { Howl, Howler } from 'howler';

const sounds = {
  select: new Howl({ src: ['/sounds/select.ogg'], volume: 0.15 }),
  move: new Howl({ src: ['/sounds/move.ogg'], volume: 0.25 }),
  win: new Howl({ src: ['/sounds/win.ogg'], volume: 0.4 }),
};

export const playSound = async (soundName: keyof typeof sounds) => {
  if (Howler.ctx && Howler.ctx.state === 'suspended') {
    await Howler.ctx.resume();
  }
  sounds[soundName].play();
};
