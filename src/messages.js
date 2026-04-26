const messageBank = {
  cozy: {
    label: 'Cozy Friend',
    accent: '#d7b98e',
    mark: 'CF',
    water: [
      'A little water would be kind to future you.',
      'Soft check-in: your glass could use a refill.',
      'Tiny pause, tiny sip, then back to it.'
    ],
    eyeBreak: [
      'Let your eyes wander somewhere far away for a moment.',
      'Twenty calm seconds off-screen would be lovely.',
      'Your focus has been steady. Give your eyes a small rest.'
    ],
    stretch: [
      'Uncurl your shoulders and take a slow breath.',
      'A short stretch might make the next hour feel easier.',
      'Stand up if you can. Your back will appreciate the vote.'
    ],
    motivation: [
      'You are allowed to move steadily, not perfectly.',
      'Small progress still counts. Keep the thread warm.',
      'One careful next step is enough.'
    ]
  },
  strict: {
    label: 'Strict Coach',
    accent: '#93a7ff',
    mark: 'SC',
    water: [
      'Hydration check. Take the sip.',
      'Water now. Make it quick and clean.',
      'You set the standard. Refill the glass.'
    ],
    eyeBreak: [
      'Eyes off the screen. Twenty seconds.',
      'Reset your vision. No debate.',
      'Look away and breathe. Then resume.'
    ],
    stretch: [
      'Posture audit. Stand and stretch.',
      'Shoulders back. Neck loose. Move.',
      'A disciplined body supports disciplined work.'
    ],
    motivation: [
      'Do the next right task. Momentum follows.',
      'Keep standards high and scope realistic.',
      'Focus is trained. Train it now.'
    ]
  },
  space: {
    label: 'Space Buddy',
    accent: '#8ad7ff',
    mark: 'SB',
    water: [
      'Hydration levels are drifting. Initiate sip sequence.',
      'Crew comfort protocol: drink some water.',
      'Tiny refill mission available.'
    ],
    eyeBreak: [
      'Scan the horizon beyond the viewport.',
      'Optics need a quick recalibration.',
      'Look at something distant. Stars optional.'
    ],
    stretch: [
      'Gravity check. Stand, stretch, re-enter orbit.',
      'Crew mobility break recommended.',
      'Loosen the joints before the next launch window.'
    ],
    motivation: [
      'Course is steady. Continue the mission.',
      'One small burn can change the whole trajectory.',
      'You are still in flight. Keep going.'
    ]
  },
  guardian: {
    label: 'Dark Guardian',
    accent: '#b091ff',
    mark: 'DG',
    water: [
      'The vessel requires water. Restore it.',
      'A quiet command: drink.',
      'Guard your energy. Hydrate.'
    ],
    eyeBreak: [
      'Withdraw your gaze from the glow.',
      'Rest your eyes before the dark pushes back.',
      'Look away. Hold the line.'
    ],
    stretch: [
      'Rise. Reset the frame.',
      'Unbind the shoulders. Continue stronger.',
      'The body is part of the watch.'
    ],
    motivation: [
      'You do not need noise. You need the next move.',
      'Stay deliberate. Stay difficult to shake.',
      'Quiet persistence wins more than spectacle.'
    ]
  },
  gremlin: {
    label: 'Funny Gremlin',
    accent: '#9ee493',
    mark: 'FG',
    water: [
      'Drink water before your brain files a complaint.',
      'Sip time. The tiny office chaos committee insists.',
      'Your glass is doing dramatic empty-glass theater.'
    ],
    eyeBreak: [
      'Unstick your eyeballs from the glowing rectangle.',
      'Look away. Blink like you remembered being human.',
      'Give the peepers a tiny vacation.'
    ],
    stretch: [
      'Stretch before your chair claims you permanently.',
      'Do a shoulder wiggle. Dignity optional.',
      'Stand up and convince your spine you still care.'
    ],
    motivation: [
      'You are weirdly capable. Continue.',
      'Do the next small thing and pretend it was the plan.',
      'Progress has entered the chat.'
    ]
  }
};

const nudgeLabels = {
  water: 'Water',
  eyeBreak: 'Eye break',
  stretch: 'Stretch',
  motivation: 'Motivation'
};

function pickMessage(personality, category) {
  const bank = messageBank[personality] || messageBank.cozy;
  const messages = bank[category] || messageBank.cozy[category] || [];
  return messages[Math.floor(Math.random() * messages.length)] || 'Time for a gentle check-in.';
}

module.exports = { messageBank, nudgeLabels, pickMessage };
