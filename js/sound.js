// sound.js - 전역 사운드 관리 시스템

// 사운드 매니저 (싱글톤)
const SoundManager = (function() {
    let instance = null;
    
    class SoundManagerClass {
        constructor() {
            if (instance) {
                return instance;
            }
            
            this.bgm = null;
            this.clickSound = null;
            this.hitSound = null;
            this.levelUpSound = null;
            
            this.bgmVolume = parseFloat(localStorage.getItem('bgmVolume') || '0.3');
            this.sfxVolume = parseFloat(localStorage.getItem('sfxVolume') || '0.5');
            
            this.bgmLoaded = false;
            this.bgmStarted = false;
            
            instance = this;
        }
        
        // BGM 초기화 (페이지별로 한 번만)
        initBGM() {
            if (this.bgmLoaded) return;
            
            this.bgm = new Audio('Sounds/BGM.m4a');
            this.bgm.loop = true;
            this.bgm.volume = this.bgmVolume;
            this.bgm.muted = true;
            this.bgmLoaded = true;
            
            // 페이지 언로드 시 현재 재생 시간 저장
            window.addEventListener('beforeunload', () => {
                if (this.bgm && !this.bgm.paused) {
                    localStorage.setItem('bgmTime', this.bgm.currentTime.toString());
                    localStorage.setItem('bgmPlaying', 'true');
                }
            });
            
            // 페이지 로드 시 이전 재생 시간 복원
            const savedTime = parseFloat(localStorage.getItem('bgmTime') || '0');
            const wasPlaying = localStorage.getItem('bgmPlaying') === 'true';
            
            if (savedTime > 0) {
                this.bgm.currentTime = savedTime;
            }
            
            if (wasPlaying) {
                this.startBGM();
            }
        }
        
        // BGM 시작
        startBGM() {
            if (!this.bgmStarted && this.bgm) {
                const playPromise = this.bgm.play();
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            this.bgmStarted = true;
                            this.bgm.muted = false;
                            localStorage.setItem('bgmPlaying', 'true');
                        })
                        .catch(e => {
                            console.log('BGM autoplay blocked, waiting for user interaction...');
                            // 사용자 인터랙션 시 재시도
                            document.addEventListener('click', () => {
                                if (!this.bgmStarted) {
                                    this.bgm.play()
                                        .then(() => {
                                            this.bgmStarted = true;
                                            this.bgm.muted = false;
                                        })
                                        .catch(e => console.log('BGM play failed'));
                                }
                            }, { once: true });
                        });
                }
            }
        }
        
        // 효과음 초기화
        initSounds() {
            if (!this.clickSound) {
                this.clickSound = new Audio('Sounds/Click.m4a');
                this.clickSound.volume = this.sfxVolume;
            }
            if (!this.hitSound) {
                this.hitSound = new Audio('Sounds/Hit.m4a');
                this.hitSound.volume = Math.min(1.0, this.sfxVolume * 0.8);
            }
            if (!this.levelUpSound) {
                this.levelUpSound = new Audio('Sounds/LevelUp.m4a');
                this.levelUpSound.volume = Math.min(1.0, this.sfxVolume * 1.0);
            }
        }
        
        // 클릭 사운드 재생
        playClick() {
            if (this.clickSound) {
                this.clickSound.currentTime = 0;
                this.clickSound.play().catch(e => console.log('Click sound error'));
            }
            this.startBGM(); // 첫 인터랙션 시 BGM 시작
        }
        
        // 피격 사운드 재생
        playHit() {
            if (this.hitSound) {
                this.hitSound.currentTime = 0;
                this.hitSound.play().catch(e => console.log('Hit sound error'));
            }
        }
        
        // 레벨업 사운드 재생
        playLevelUp() {
            if (this.levelUpSound) {
                this.levelUpSound.currentTime = 0;
                this.levelUpSound.play().catch(e => console.log('LevelUp sound error'));
            }
        }
        
        // BGM 볼륨 설정
        setBGMVolume(volume) {
            this.bgmVolume = Math.max(0, Math.min(1, volume));
            if (this.bgm) {
                this.bgm.volume = this.bgmVolume;
            }
            localStorage.setItem('bgmVolume', this.bgmVolume.toString());
        }
        
        // 효과음 볼륨 설정
        setSFXVolume(volume) {
            this.sfxVolume = Math.max(0, Math.min(1, volume));
            if (this.clickSound) this.clickSound.volume = this.sfxVolume;
            if (this.hitSound) this.hitSound.volume = this.sfxVolume * 0.8;
            if (this.levelUpSound) this.levelUpSound.volume = Math.min(1, this.sfxVolume * 1.2); // 최대 1.0 제한
            localStorage.setItem('sfxVolume', this.sfxVolume.toString());
        }
        
        // 볼륨 가져오기
        getBGMVolume() {
            return this.bgmVolume;
        }
        
        getSFXVolume() {
            return this.sfxVolume;
        }
    }
    
    return new SoundManagerClass();
})();

// 전역 함수로 노출
window.soundManager = SoundManager;
window.playClickSound = () => SoundManager.playClick();
window.playHitSound = () => SoundManager.playHit();
window.playLevelUpSound = () => SoundManager.playLevelUp();
