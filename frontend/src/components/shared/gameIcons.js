// The game-icons.net icons (react-icons/gi) the app draws, by name. SafeIcon, the
// character creator and the action matrix look a name up here, so an icon shows only when
// it is listed: a name that is not here draws nothing, as an unknown name always did.
//
// Taking the whole set (import * as Gi from 'react-icons/gi') and reading it by name put
// every one of its icons, about 4,000, in the main bundle, and the production build had to
// hold all of them in memory (frontend/.npmrc). Named re-exports let the build keep only
// these. A new icon name in the app's data goes on this list; a name react-icons does not
// have fails the build.
export {
  GiAmplitude, GiArchiveResearch, GiArmorVest, GiBiceps, GiBleedingEye, GiBookCover,
  GiBookmarklet, GiBookPile, GiBreakingChain, GiBriefcase, GiBrokenTablet, GiBubblingFlask,
  GiCabbage, GiCaduceus, GiCandleHolder, GiCandleLight, GiCandleSkull, GiCardRandom,
  GiCastle, GiCauldron, GiChainedHeart, GiCheckMark, GiChemicalDrop, GiChewedHeart,
  GiChoice, GiCircleClaws, GiCoinflip, GiCompanionCube, GiCompass, GiCrenulatedShield,
  GiCrestedHelmet, GiCrimeSceneTape, GiCrossedSwords, GiCrystalBall, GiDaggerRose,
  GiDeathNote, GiDiamonds, GiDiceSixFacesFive, GiDiceSixFacesSix, GiDigHole, GiDiscussion,
  GiDistraction, GiDominoMask, GiDramaMasks, GiDread, GiEnlightenment, GiEyepatch,
  GiEyeShield, GiFiles, GiFilmProjector, GiFireworkRocket, GiFirstAidKit, GiFluffyCloud,
  GiFrontalLobe, GiFrozenOrb, GiGhost, GiGlowingHands, GiGoldShell, GiHalfDead,
  GiHandBandage, GiHeadshot, GiHealthPotion, GiHeartInside, GiHeartStake, GiHeartTower,
  GiHelmetHeadShot, GiHoodedAssassin, GiHourglass, GiHumanEar, GiIciclesAura, GiImprisoned,
  GiJuggler, GiKey, GiKnifeThrust, GiLantern, GiLifeBar, GiLips, GiLitCandelabra,
  GiLockpicks, GiMachete, GiMagickTrick, GiMagicPalm, GiMagicSwirl, GiMagnifyingGlass,
  GiMedal, GiMedallist, GiMeshNetwork, GiMicrophone, GiMinions, GiMoon, GiMountainClimbing,
  GiMuscleUp, GiNewspaper, GiNinjaMask, GiNotebook, GiOilySpiral, GiOnSight,
  GiOppositeHearts, GiOrbital, GiOrganigram, GiOuroboros, GiPadlock, GiPaperClip, GiPapers,
  GiParanoia, GiPathDistance, GiPistolGun, GiPocketWatch, GiPublicSpeaker, GiQuillInk,
  GiRabbit, GiRadarSweep, GiRaggedWound, GiRearAura, GiRevolver, GiRollingDices,
  GiRosaShield, GiRuneStone, GiScalpel, GiScrollUnfurled, GiSemiClosedEye, GiShield,
  GiShouting, GiSinkingShip, GiSnatch, GiSpectacles, GiSpellBook, GiSpoon, GiStarFormation,
  GiStiletto, GiSuitcase, GiSunkenEye, GiSyringe, GiTabletopPlayers, GiTestTubes,
  GiThirdEye, GiThreeFriends, GiTreasureMap, GiTrenchAssault, GiWatchtower, GiWaxSeal,
  GiWhip, GiWhistle,
} from 'react-icons/gi';
