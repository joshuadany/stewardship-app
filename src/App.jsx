import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  BookOpen, 
  Sparkles, 
  Users, 
  Award, 
  CheckCircle, 
  XCircle, 
  PlusCircle, 
  MinusCircle,
  User, 
  Lock, 
  Shield, 
  Heart, 
  Coins, 
  Calendar, 
  LogOut, 
  Clock, 
  Smartphone, 
  Gift, 
  AlertCircle,
  Camera,
  Image as ImageIcon,
  Trash2
} from 'lucide-react';

// --- 파이어베이스 설정 구성 ---
// 로컬 PC에서 실행하거나 실제 배포할 때는 여기에 본인의 Firebase 설정 키값을 대입해 주세요.
let firebaseConfig = {
  apiKey: "AIzaSyBPM0VMi6RLXlVuDqhDWr5Jv6R--ySjBJE",
  authDomain: "stewardship-race.firebaseapp.com",
  projectId: "stewardship-race",
  storageBucket: "stewardship-race.firebasestorage.app",
  messagingSenderId: "856526911515",
  appId: "1:856526911515:web:71160a0a3511c7ebb6a0be"
};

// Canvas 프리뷰 환경이거나 실제 시스템 주입 설정이 있을 경우 자동 연동해 줍니다.
if (typeof __firebase_config !== 'undefined' && __firebase_config) {
  try {
    firebaseConfig = JSON.parse(__firebase_config);
  } catch (e) {
    console.warn("System firebase config parse failed, falling back to static config.");
  }
}

// 개발자가 본인의 실제 키값으로 교체했는지 감지하는 기준 플래그입니다.
const isMockMode = firebaseConfig.apiKey === "YOUR_API_KEY" || !firebaseConfig.apiKey;

// 가짜/실제 데이터베이스 이중화 세팅
let app = null;
let auth = null;
let db = null;

if (!isMockMode) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.error("Firebase initialization failed:", e);
  }
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'stewardship-race-bankbook';

// --- 적립(입금) 및 차감(출금) 행동 기준표 ---
const ACTIVITY_CRITERIA = {
  deposit: [
    { id: 'word_1', category: '📖 말씀 생활', title: '주일집회 참석', points: 15 },
    { id: 'word_2', category: '📖 말씀 생활', title: '주일, 수요집회 말씀 정리', points: 15 },
    { id: 'word_3', category: '📖 말씀 생활', title: '성경 말씀 올리기 (무등교회 성경 읽기방)', points: 10 },
    { id: 'word_4', category: '📖 말씀 생활', title: '참빛 암송 완료', points: 15 },
    { id: 'word_5', category: '📖 말씀 생활', title: '참빛 교재 풀이', points: 15 },
    
    { id: 'prayer_1', category: '🙏 기도 생활', title: '개인 기도 10분 이상 (1회)', points: 15 },
    { id: 'prayer_2', category: '🙏 기도 생활', title: '기도 수첩 기도 목록 적기', points: 10 },
    { id: 'prayer_3', category: '🙏 기도 생활', title: '합심 기도 참여', points: 10 },
    
    { id: 'fellow_1', category: '🤝 교제 생활', title: '중고등부 모임 지각하지 않기', points: 15 },
    { id: 'fellow_2', category: '🤝 교제 생활', title: '모임 지각 없이 10분 전 미리 오기', points: 20 },
    { id: 'fellow_3', category: '🤝 교제 생활', title: '토요교제 참석', points: 20 },
    { id: 'fellow_4', category: '🤝 교제 생활', title: '주일모임 참석', points: 20 },
    { id: 'fellow_5', category: '🤝 교제 생활', title: '하계수양회/수련회/전도집회 참석', points: 35 },
    { id: 'fellow_6', category: '🤝 교제 생활', title: '간증하기', points: 30 },
    
    { id: 'fight_1', category: '⚔️ 영적 싸움', title: '스마트폰 절제 (하루 1시간 이내 성공 - 부모 확인 필요)', points: 10 },
    
    { id: 'evangel_1', category: '📢 전도 생활', title: '친구 전도 기도 부탁', points: 5 },
    { id: 'evangel_2', category: '📢 전도 생활', title: '친구 전도 기도 명단 제출', points: 5 },
    { id: 'evangel_3', category: '📢 전도 생활', title: '무등교회 전도집회 친구 인도 참석', points: 35 },
    { id: 'evangel_4', category: '📢 전도 생활', title: '하계수양회 친구 인도 참석', points: 35 },
    
    { id: 'offering_1', category: '💰 헌금 생활', title: '주일헌금 드림', points: 10 },
    { id: 'offering_2', category: '💰 헌금 생활', title: '감사헌금/특별헌금 드림', points: 10 },
    
    { id: 'service_1', category: '🫶 섬김·봉사', title: '교육원(중고등부실 등) 청소 및 정리', points: 10 },
    { id: 'service_2', category: '🫶 섬김·봉사', title: '교회 내 봉사 활동 1회', points: 10 },
    { id: 'service_3', category: '🫶 섬김·봉사', title: '가정 집안일 돕기 (청소, 쓰레기, 심부름 등)', points: 10 },
    
    { id: 'praise_1', category: '🎵 찬양 생활', title: '찬양 신청하기', points: 5 },
    { id: 'custom_in', category: '✨ 기타 입금', title: '기타 주님을 기쁘시게 한 모습 (직접 입력)', points: 0 }
  ],
  withdrawal: [
    { id: 'out_1', category: '📱 스마트폰', title: '스마트폰 과사용 (1시간 초과)', points: 5 },
    { id: 'out_2', category: '❌ 모임 불참', title: '중고등부 정기, 필수 모임 미참석', points: 10 },
    { id: 'custom_out', category: '⚠️ 기타 경고', title: '기타 주님을 기쁘시게 하지 못한 모습', points: 0 }
  ]
};

// --- 달란트 교환소 보상 목표 ---
const REWARDS = [
  { level: '🥉 브론즈', target: 250, reward: '편의점 상품권 5,000원' },
  { level: '🥈 실버', target: 400, reward: '편의점 상품권 10,000원' },
  { level: '🥇 골드', target: 600, reward: '올리브영 or 배달 상품권 30,000원 + 특별 수료증' },
  { level: '👑 플래티넘', target: 800, reward: '올리브영 or 배달 상품권 50,000원 + 수련회 참가비 일부 지원 + 트로피' }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // 데이터베이스 수신 상태
  const [profiles, setProfiles] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  // UI 내비게이션 및 세션 관리 상태
  const [currentProfile, setCurrentProfile] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(''); 
  const [tab, setTab] = useState('dashboard'); 
  const [toast, setToast] = useState(null);
  const [viewerImage, setViewerImage] = useState(null); // 큰 이미지 뷰어 팝업 상태
  
  // 모달 창 노출 여부
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  
  // 이미지 압축 처리 로딩 상태
  const [isCompresing, setIsCompresing] = useState(false);

  // 입력 폼 제어 상태
  const [newProfileForm, setNewProfileForm] = useState({
    name: '',
    role: 'student', 
    dept: '고등부', 
    grade: '1', 
    gender: '형제', 
    teacherName: '',
    childName: '' 
  });

  const [newTxForm, setNewTxForm] = useState({
    studentId: '',
    type: 'deposit', 
    itemId: 'word_1',
    customTitle: '',
    customPoints: 0,
    date: new Date().toISOString().split('T')[0],
    proofImage: '' // 증빙 이미지 Base64 스트링
  });

  // 교사 전용 즉시 입출금 폼 제어 상태 (입금/출금 병합 개편)
  const [adminQuickTx, setAdminQuickTx] = useState({
    studentId: '',
    type: 'deposit', // deposit or withdrawal
    itemId: 'word_1',
    customTitle: '',
    customPoints: 15,
    date: new Date().toISOString().split('T')[0],
    proofImage: ''
  });

  // 이미지 수동 등록 Ref
  const fileInputRef = useRef(null);
  const quickFileInputRef = useRef(null);

  // 토스트 메시지 함수
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 이미지 모바일 최적화 자동 컴프레션 로직
  const handleImageUpload = (e, callback) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsCompresing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400; // Firestore 전송 속도 및 용량을 고려해 가로세로 최대 400px 리사이징
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // JPEG 포맷 고압축(70%) 데이터 URL 추출
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        callback(compressedBase64);
        setIsCompresing(false);
        showToast("증빙 사진이 압축 처리되어 성공적으로 등록되었습니다!");
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // 1. 익명 로그인 및 초기 인증 수행
  useEffect(() => {
    if (isMockMode) {
      setUser({ uid: 'local_demo_user', isAnonymous: true });
      setLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Authentication Error:", error);
        showToast("인증오류가 발생했습니다.", "error");
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. 실시간 데이터베이스 연동 및 로컬 가상 스토리지 연동
  useEffect(() => {
    if (!user) return;

    if (isMockMode) {
      const savedProfiles = localStorage.getItem('mock_profiles');
      if (savedProfiles) {
        setProfiles(JSON.parse(savedProfiles));
      } else {
        const seedProfiles = [
          { id: 'placeholder_minwoo', name: '김민우', role: 'student', dept: '고등부', grade: '1', gender: '형제', teacherName: '이진호 교사' },
          { id: 'placeholder_eunhye', name: '박은혜', role: 'student', dept: '중등부', grade: '3', gender: '자매', teacherName: '정수연 교사' },
          { id: 'placeholder_jinho', name: '이진호', role: 'teacher', dept: '고등부', grade: '교사', gender: '형제', teacherName: '고등부 부장' },
          { id: 'placeholder_seoyeon', name: '최서연', role: 'parent', dept: '학부모', grade: '학부모', gender: '자매', childName: '김민우' }
        ];
        setProfiles(seedProfiles);
        localStorage.setItem('mock_profiles', JSON.stringify(seedProfiles));
      }

      const savedTxs = localStorage.getItem('mock_transactions');
      if (savedTxs) {
        setTransactions(JSON.parse(savedTxs));
      } else {
        const sampleTxs = [
          { id: 'tx_sample_1', date: '2026-06-10', title: '주일집회 참석', type: 'deposit', category: '📖 말씀 생활', points: 15, studentId: 'placeholder_minwoo', studentName: '김민우', teacherCheck: true, parentCheck: false, creator: 'teacher', proofImage: '' },
          { id: 'tx_sample_2', date: '2026-06-12', title: '스마트폰 절제 성공', type: 'deposit', category: '⚔️ 영적 싸움', points: 10, studentId: 'placeholder_minwoo', studentName: '김민우', teacherCheck: true, parentCheck: true, creator: 'student', proofImage: '' },
          { id: 'tx_sample_3', date: '2026-06-14', title: '주일헌금 드림', type: 'deposit', category: '💰 헌금 생활', points: 10, studentId: 'placeholder_minwoo', studentName: '김민우', teacherCheck: true, parentCheck: false, creator: 'student', proofImage: '' },
          { id: 'tx_sample_4', date: '2026-06-15', title: '스마트폰 과사용 (1시간 초과)', type: 'withdrawal', category: '📱 스마트폰', points: 5, studentId: 'placeholder_minwoo', studentName: '김민우', teacherCheck: true, parentCheck: true, creator: 'parent', proofImage: '' }
        ];
        setTransactions(sampleTxs);
        localStorage.setItem('mock_transactions', JSON.stringify(sampleTxs));
      }

      const savedProfileId = localStorage.getItem('selected_profile_id');
      if (savedProfileId) {
        const list = JSON.parse(localStorage.getItem('mock_profiles') || '[]');
        const found = list.find(p => p.id === savedProfileId);
        if (found) {
          setCurrentProfile(found);
          if (found.role === 'student') {
            setSelectedStudentId(found.id);
          } else if (found.role === 'parent' && found.childName) {
            const child = list.find(c => c.name === found.childName && c.role === 'student');
            if (child) {
              setSelectedStudentId(child.id);
            }
          }
        }
      }
      return;
    }

    const profilesCol = collection(db, 'artifacts', appId, 'public', 'data', 'profiles');
    const unsubProfiles = onSnapshot(profilesCol, (snapshot) => {
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setProfiles(list);
      
      const savedProfileId = localStorage.getItem('selected_profile_id');
      if (savedProfileId) {
        const found = list.find(p => p.id === savedProfileId);
        if (found) {
          setCurrentProfile(found);
          if (found.role === 'student') {
            setSelectedStudentId(found.id);
          } else if (found.role === 'parent' && found.childName) {
            const child = list.find(c => c.name === found.childName && c.role === 'student');
            if (child) {
              setSelectedStudentId(child.id);
            }
          }
        }
      }
    });

    const txCol = collection(db, 'artifacts', appId, 'public', 'data', 'transactions');
    const unsubTx = onSnapshot(txCol, (snapshot) => {
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      list.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(list);
    });

    return () => {
      unsubProfiles();
      unsubTx();
    };
  }, [user]);

  // 계정 선택 및 로그인 스위칭 기능
  const handleSelectProfile = (profile) => {
    setCurrentProfile(profile);
    localStorage.setItem('selected_profile_id', profile.id);
    showToast(`${profile.name} 계정으로 로그인되었습니다.`);
    
    if (profile.role === 'student') {
      setSelectedStudentId(profile.id);
    } else if (profile.role === 'parent' && profile.childName) {
      const child = profiles.find(p => p.name === profile.childName && p.role === 'student');
      if (child) {
        setSelectedStudentId(child.id);
      } else {
        setSelectedStudentId('');
      }
    } else {
      const firstStudent = profiles.find(p => p.role === 'student');
      if (firstStudent) {
        setSelectedStudentId(firstStudent.id);
      }
    }
    setTab('dashboard');
  };

  // 로그아웃
  const handleLogout = () => {
    setCurrentProfile(null);
    localStorage.removeItem('selected_profile_id');
    showToast("로그아웃 되었습니다.");
  };

  // 신규 가입 (통장 생성)
  const handleCreateProfile = async (e) => {
    e.preventDefault();
    if (!newProfileForm.name.trim()) {
      showToast("이름을 입력해주세요.", "error");
      return;
    }

    if (isMockMode) {
      const newProfile = { id: 'mock_profile_' + Date.now(), ...newProfileForm };
      const updated = [...profiles, newProfile];
      setProfiles(updated);
      localStorage.setItem('mock_profiles', JSON.stringify(updated));
      showToast(`${newProfile.name} 청지기님의 계정이 가입 축하금 50달란트와 함께 개설되었습니다!`);
      setShowAddProfileModal(false);
      handleSelectProfile(newProfile);
      return;
    }

    try {
      const profilesCol = collection(db, 'artifacts', appId, 'public', 'data', 'profiles');
      const docRef = doc(profilesCol);
      const data = { ...newProfileForm };
      await setDoc(docRef, data);
      showToast(`${data.name} 청지기님의 계정이 가입 축하금 50달란트와 함께 개설되었습니다!`);
      setShowAddProfileModal(false);
      handleSelectProfile({ id: docRef.id, ...data });
    } catch (error) {
      console.error(error);
      showToast("가입에 실패했습니다.", "error");
    }
  };

  // 새로운 달란트 활동 내역 등록 (교사/학부모 직접 입금, 출금 및 증빙 포함)
  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    
    const isCustom = newTxForm.itemId === 'custom_in' || newTxForm.itemId === 'custom_out';
    let activity = null;
    
    if (!isCustom) {
      const searchPool = newTxForm.type === 'deposit' ? ACTIVITY_CRITERIA.deposit : ACTIVITY_CRITERIA.withdrawal;
      activity = searchPool.find(item => item.id === newTxForm.itemId);
    }

    const title = isCustom ? newTxForm.customTitle : activity.title;
    const points = isCustom ? Number(newTxForm.customPoints) : activity.points;
    const category = isCustom ? (newTxForm.type === 'deposit' ? '✨ 기타 입금' : '⚠️ 기타 경고') : activity.category;

    if (!title.trim()) {
      showToast("내용을 입력해주세요.", "error");
      return;
    }
    if (points <= 0 && isCustom) {
      showToast("포인트를 1 이상 입력해주세요.", "error");
      return;
    }

    let targetStudentId = selectedStudentId;
    if (currentProfile.role === 'student') {
      targetStudentId = currentProfile.id;
    }

    const studentProfile = profiles.find(p => p.id === targetStudentId);
    if (!studentProfile) {
      showToast("대상이 될 학생을 선택해 주세요.", "error");
      return;
    }

    const isTeacher = currentProfile.role === 'teacher';
    const isParent = currentProfile.role === 'parent';

    const txData = {
      date: newTxForm.date,
      title,
      type: newTxForm.type,
      category,
      points,
      studentId: targetStudentId,
      studentName: studentProfile.name,
      teacherCheck: isTeacher ? true : false,
      parentCheck: isParent ? true : false,
      creator: currentProfile.role,
      proofImage: newTxForm.proofImage || ''
    };

    if (isMockMode) {
      const newTx = { id: 'mock_tx_' + Date.now(), ...txData };
      const updated = [newTx, ...transactions];
      setTransactions(updated);
      localStorage.setItem('mock_transactions', JSON.stringify(updated));
      if (isTeacher || isParent) {
        showToast("권한자의 작성으로 내역 및 사진이 실시간 가상 장부에 즉각 승인 반영되었습니다!");
      } else {
        showToast("정상적으로 신청되었습니다. 선생님 확인 승인 후 최종 반영됩니다! (데모)");
      }
      setShowAddTxModal(false);
      // Reset Form Image
      setNewTxForm(prev => ({ ...prev, proofImage: '' }));
      setTab('passbook');
      return;
    }

    try {
      const txCol = collection(db, 'artifacts', appId, 'public', 'data', 'transactions');
      await addDoc(txCol, txData);
      
      if (isTeacher || isParent) {
        showToast("교사/부모 권한으로 내역 및 증빙 자료가 통장에 즉시 입금/출금 처리되었습니다!");
      } else {
        showToast("정상적으로 신청되었습니다. 선생님 확인 승인 후 최종 반영됩니다!");
      }
      
      setShowAddTxModal(false);
      setNewTxForm(prev => ({ ...prev, proofImage: '' }));
      setTab('passbook');
    } catch (error) {
      console.error(error);
      showToast("기록 저장 중 오류 발생", "error");
    }
  };

  // 교사용 전용 다이렉트 신속 입출금 등록기 처리 (증빙 사진 포함)
  const handleAdminQuickTxSubmit = async (e) => {
    e.preventDefault();
    if (!adminQuickTx.studentId) {
      showToast("기록을 적용할 학생을 선택해 주세요.", "error");
      return;
    }

    const targetStudent = profiles.find(p => p.id === adminQuickTx.studentId);
    if (!targetStudent) return;

    const isCustom = adminQuickTx.itemId === 'custom_in' || adminQuickTx.itemId === 'custom_out';
    let activity = null;
    if (!isCustom) {
      const searchPool = adminQuickTx.type === 'deposit' ? ACTIVITY_CRITERIA.deposit : ACTIVITY_CRITERIA.withdrawal;
      activity = searchPool.find(item => item.id === adminQuickTx.itemId);
    }

    const title = isCustom ? adminQuickTx.customTitle : activity.title;
    const points = isCustom ? Number(adminQuickTx.customPoints) : activity.points;
    const category = isCustom ? (adminQuickTx.type === 'deposit' ? '✨ 기타 입금' : '⚠️ 기타 경고') : activity.category;

    if (!title.trim()) {
      showToast("내용을 입력해 주세요.", "error");
      return;
    }

    const txData = {
      date: adminQuickTx.date,
      title,
      type: adminQuickTx.type,
      category,
      points,
      studentId: adminQuickTx.studentId,
      studentName: targetStudent.name,
      teacherCheck: true, // 교사 본인 작성이므로 자동 체크 승인
      parentCheck: false,
      creator: 'teacher',
      proofImage: adminQuickTx.proofImage || ''
    };

    if (isMockMode) {
      const newTx = { id: 'mock_tx_' + Date.now(), ...txData };
      const updated = [newTx, ...transactions];
      setTransactions(updated);
      localStorage.setItem('mock_transactions', JSON.stringify(updated));
      showToast(`${targetStudent.name} 학생의 즉각 입출금(및 증빙사진)이 가상 적용되었습니다.`);
      setAdminQuickTx(prev => ({ ...prev, customTitle: '', customPoints: 15, proofImage: '' }));
      return;
    }

    try {
      const txCol = collection(db, 'artifacts', appId, 'public', 'data', 'transactions');
      await addDoc(txCol, txData);
      showToast(`${targetStudent.name} 학생의 입출금 처리가 즉각 확정 및 게시되었습니다.`);
      setAdminQuickTx(prev => ({ ...prev, customTitle: '', customPoints: 15, proofImage: '' }));
    } catch (error) {
      console.error(error);
      showToast("신속 등록 실패", "error");
    }
  };

  // 실시간 승인/체크 상태 전환
  const handleToggleCheck = async (txId, checkType) => {
    if (!currentProfile) return;
    
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;

    const isTeacher = currentProfile.role === 'teacher';
    const isParent = currentProfile.role === 'parent';

    if (checkType === 'teacher' && !isTeacher) {
      showToast("교사 확인 권한이 필요합니다.", "error");
      return;
    }
    if (checkType === 'parent' && !isParent) {
      showToast("학부모 확인 권한이 필요합니다.", "error");
      return;
    }

    if (isMockMode) {
      const updated = transactions.map(t => {
        if (t.id === txId) {
          return {
            ...t,
            [checkType === 'teacher' ? 'teacherCheck' : 'parentCheck']: !t[checkType === 'teacher' ? 'teacherCheck' : 'parentCheck']
          };
        }
        return t;
      });
      setTransactions(updated);
      localStorage.setItem('mock_transactions', JSON.stringify(updated));
      showToast("승인 상태가 가상으로 연동되었습니다.");
      return;
    }

    const txDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'transactions', txId);
    const newValue = checkType === 'teacher' ? !tx.teacherCheck : !tx.parentCheck;

    try {
      await updateDoc(txDocRef, {
        [checkType === 'teacher' ? 'teacherCheck' : 'parentCheck']: newValue
      });
      showToast(`확인 표식을 ${newValue ? '승인' : '해제'} 하였습니다.`);
    } catch (error) {
      console.error(error);
      showToast("업데이트 중 오류가 발생했습니다.", "error");
    }
  };

  // 내역 파괴 삭제 (선생님 권한)
  const handleDeleteTx = async (txId) => {
    if (currentProfile?.role !== 'teacher') {
      showToast("내역 삭제 권한은 선생님께만 있습니다.", "error");
      return;
    }
    
    if (isMockMode) {
      const updated = transactions.filter(t => t.id !== txId);
      setTransactions(updated);
      localStorage.setItem('mock_transactions', JSON.stringify(updated));
      showToast("로컬 내역이 삭제되었습니다.");
      return;
    }

    try {
      const txDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'transactions', txId);
      await deleteDoc(txDocRef);
      showToast("내역이 삭제되었습니다.");
    } catch (error) {
      console.error(error);
      showToast("삭제 중 에러가 발생했습니다.", "error");
    }
  };

  // 실시간 단일 학생 입출금 데이터 연동 및 순수 총 달란트 연산 (+기본 시작 지급금 50 적용)
  const studentSummary = useMemo(() => {
    if (!selectedStudentId) return { total: 50, depositSum: 50, withdrawSum: 0, level: '새내기 청지기', nextLevel: REWARDS[0], list: [] };

    const studentTxs = transactions.filter(t => t.studentId === selectedStudentId);
    
    let balance = 50; 
    let depSum = 50;  
    let witSum = 0;   

    const targetStudent = profiles.find(p => p.id === selectedStudentId);
    const initialTx = {
      id: 'initial_signup_points',
      date: '2026-06-01',
      title: '선한 청지기 경주 참가 축하 (기본 달란트 적립)',
      type: 'deposit',
      category: '🎁 가입 축하',
      points: 50,
      studentId: selectedStudentId,
      studentName: targetStudent?.name || '',
      teacherCheck: true,
      parentCheck: true,
      creator: 'system',
      runningBalance: 50,
      proofImage: ''
    };

    const chronologicalTxs = [...studentTxs].reverse();
    const listWithRunningBalance = [];

    chronologicalTxs.forEach(tx => {
      const isApproved = tx.teacherCheck;
      let change = 0;
      if (isApproved) {
        if (tx.type === 'deposit') {
          change = tx.points;
          depSum += tx.points;
        } else {
          change = -tx.points;
          witSum += tx.points;
        }
      }
      balance += change;
      listWithRunningBalance.push({
        ...tx,
        runningBalance: balance
      });
    });

    listWithRunningBalance.unshift(initialTx);
    const newestFirstList = listWithRunningBalance.reverse();

    let level = '새내기 청지기';
    let nextLevel = REWARDS[0];

    for (let i = 0; i < REWARDS.length; i++) {
      if (balance >= REWARDS[i].target) {
        level = REWARDS[i].level;
        nextLevel = REWARDS[i + 1] || null;
      } else {
        break;
      }
    }

    return {
      total: balance,
      depositSum: depSum,
      withdrawSum: witSum,
      level,
      nextLevel,
      list: newestFirstList
    };
  }, [transactions, selectedStudentId, profiles]);

  const studentProfiles = useMemo(() => {
    return profiles.filter(p => p.role === 'student');
  }, [profiles]);

  const pendingTeacherApprovalsCount = useMemo(() => {
    return transactions.filter(t => !t.teacherCheck).length;
  }, [transactions]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      
      {/* 로컬 가상 시뮬레이션 알림 바 */}
      {isMockMode && (
        <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-center text-3xs font-extrabold flex justify-center items-center gap-1.5 shadow-inner">
          <AlertCircle size={12} />
          <span>로컬 데모 모드 작동 중: 파이어베이스 설정 연결 전에는 데이터가 기기 로컬에 임시 보관됩니다.</span>
        </div>
      )}

      {/* 토스트 경보 */}
      {toast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl border text-white animate-bounce transition-all duration-300"
          style={{
            backgroundColor: toast.type === 'error' ? '#EF4444' : '#10B981',
            borderColor: toast.type === 'error' ? '#F87171' : '#34D399'
          }}
        >
          {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          <span className="font-semibold text-sm whitespace-pre-line">{toast.message}</span>
        </div>
      )}

      {/* 헤더 */}
      <header className="bg-emerald-800 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-amber-400 p-1.5 rounded-lg text-emerald-900 shadow-inner">
              <Coins className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="font-black text-lg tracking-tight leading-tight flex items-center gap-1">
                청지기 경주 통장 <span className="text-xs bg-amber-400 text-emerald-900 px-1.5 py-0.5 rounded font-bold">ONLINE</span>
              </h1>
              <p className="text-xxs text-emerald-200">Stewardship Race Bankbook</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentProfile ? (
              <div className="flex items-center gap-1.5 bg-emerald-900/50 px-3 py-1.5 rounded-full border border-emerald-700/60 text-xs">
                <span className="font-bold text-amber-300">
                  {currentProfile.name}
                  <span className="text-xxs text-emerald-200 ml-1">
                    ({currentProfile.role === 'student' ? '학생' : currentProfile.role === 'teacher' ? '교사' : '부모'})
                  </span>
                </span>
                <button 
                  onClick={handleLogout}
                  className="p-1 hover:text-red-300 transition-colors"
                  title="로그아웃"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <span className="text-xs text-emerald-200">로그인이 필요합니다</span>
            )}
          </div>
        </div>
      </header>

      {/* 세션 비활성화 시 로그인 스위처 인터페이스 제공 */}
      {!currentProfile ? (
        <div className="flex-1 max-w-lg mx-auto w-full px-4 py-10 flex flex-col justify-center">
          <div className="bg-white rounded-3xl shadow-2xl p-6 border border-slate-100">
            <div className="text-center mb-8">
              <span className="inline-block text-4xl mb-2">✝</span>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">하나님의 선한 청지기 경주</h2>
              <p className="text-sm text-slate-500 mt-1">Stewardship Race에 참가하신 것을 환영합니다!</p>
              <div className="mt-4 bg-emerald-50 text-emerald-800 text-xs p-3.5 rounded-xl leading-relaxed text-left border border-emerald-100">
                <strong>💡 선한 청지기 경주란?</strong><br/>
                하나님께서 우리에게 맡겨주신 시간, 재능, 물질, 건강을 하나님이 기뻐하시는 방법으로 사용할 때 달란트(영적 재산)가 쌓이는 신앙 성장 프로그램입니다.
                현재 **가입 환영 보너스 50달란트**가 기본 지급된 상태로 신나게 출발합니다!
              </div>
            </div>

            {/* 빠른 역할 선택 체험 */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                👥 빠른 역할 선택 체험하기
              </label>
              <div className="grid grid-cols-2 gap-2">
                {profiles.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProfile(p)}
                    className="p-3 text-left border rounded-2xl hover:border-emerald-600 hover:bg-emerald-50/50 transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        p.role === 'student' ? 'bg-indigo-500' : p.role === 'teacher' ? 'bg-amber-500' : 'bg-rose-500'
                      }`} />
                      <span className="font-bold text-sm text-slate-800">{p.name}</span>
                    </div>
                    <span className="text-xxs text-slate-400 mt-1">
                      {p.role === 'student' ? `${p.dept} ${p.grade}학년` : p.role === 'teacher' ? '교사 / 관리자' : `${p.childName}의 부모`}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="relative flex py-3 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-xs text-slate-400 font-bold">OR</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* 계정 추가 개설 */}
            <button
              onClick={() => setShowAddProfileModal(true)}
              className="w-full mt-2 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 text-sm"
            >
              <PlusCircle size={18} />
              새로운 온라인 통장 만들기 (가입)
            </button>
          </div>
        </div>
      ) : (
        /* 정상 로그인 상태 메인화면 */
        <div className="flex-1 max-w-4xl mx-auto w-full px-3 py-4 flex flex-col gap-4">
          
          {/* 교사/학부모 대상 학생 변경 토글바 */}
          {currentProfile.role !== 'student' && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧐</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-500">
                    {currentProfile.role === 'teacher' ? '👨‍🏫 교사 대시보드' : '👩‍👦 학부모 모니터링'}
                  </h4>
                  <p className="text-sm font-black text-slate-800">
                    현재 조회 및 관리 중인 학생: <span className="text-emerald-700">
                      {profiles.find(p => p.id === selectedStudentId)?.name || '선택 없음'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">대상 학생 변경:</span>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-600"
                >
                  <option value="">-- 학생 선택 --</option>
                  {studentProfiles.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.name} ({student.dept} {student.grade}학년 / {student.teacherName || '담당교사 없음'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* 메인 탭 내비게이션 */}
          <div className="flex bg-slate-200 p-1 rounded-xl">
            <button
              onClick={() => setTab('dashboard')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                tab === 'dashboard' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles size={16} />
              메인 대시보드
            </button>
            <button
              onClick={() => setTab('passbook')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                tab === 'passbook' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen size={16} />
              온라인 통장 내역
            </button>
            <button
              onClick={() => setTab('criteria')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                tab === 'criteria' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award size={16} />
              적립·출금 기준표
            </button>
            {currentProfile.role === 'teacher' && (
              <button
                onClick={() => setTab('admin')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 relative ${
                  tab === 'admin' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Shield size={16} />
                교사 관리실
                {pendingTeacherApprovalsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-3xs font-extrabold px-1.5 py-0.5 rounded-full animate-pulse">
                    {pendingTeacherApprovalsCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* 탭 1: 대시보드 */}
          {tab === 'dashboard' && (
            <div className="flex flex-col gap-4">
              
              {selectedStudentId ? (
                (() => {
                  const targetStudent = profiles.find(p => p.id === selectedStudentId);
                  const progressPercentage = studentSummary.nextLevel 
                    ? Math.min(100, (studentSummary.total / studentSummary.nextLevel.target) * 100)
                    : 100;
                  
                  return (
                    <div className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-36 h-36 bg-amber-400/10 rounded-full blur-2xl transform translate-x-12 -translate-y-12"></div>
                      <div className="absolute -bottom-8 -left-8 w-44 h-44 bg-teal-500/20 rounded-full blur-xl"></div>
                      
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <span className="bg-amber-400/20 text-amber-300 text-xxs font-extrabold uppercase px-2 py-0.5 rounded border border-amber-400/30">
                            Stewardship Race Account
                          </span>
                          <h3 className="text-xl font-black tracking-tight mt-1">신앙 성장 경주 통장</h3>
                        </div>
                        <span className="text-3xl font-extrabold opacity-90">{studentSummary.level.split(' ')[0]}</span>
                      </div>

                      <div className="my-4">
                        <p className="text-xs text-emerald-200">사용 가능한 현재 영적 재산</p>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-4xl font-black text-amber-300 tracking-tight">
                            {studentSummary.total.toLocaleString()}
                          </span>
                          <span className="text-lg font-bold text-emerald-100">달란트</span>
                        </div>
                        <p className="text-3xs text-emerald-200/90 mt-1">※ 기본 지급된 가입 축하금 50달란트가 포함된 잔액입니다.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-emerald-600/50 text-xs">
                        <div>
                          <p className="text-emerald-300 text-3xs font-semibold">청지기 이름 / 소속</p>
                          <p className="font-bold text-sm mt-0.5">
                            {targetStudent?.name} <span className="text-xs text-emerald-200">({targetStudent?.dept} {targetStudent?.grade}학년)</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-emerald-300 text-3xs font-semibold">담당 교사</p>
                          <p className="font-bold text-sm mt-0.5">{targetStudent?.teacherName || '배정 대기중'}</p>
                        </div>
                      </div>

                      {studentSummary.nextLevel ? (
                        <div className="mt-5 bg-emerald-900/40 p-3.5 rounded-2xl border border-emerald-600/40">
                          <div className="flex justify-between text-xs mb-1.5 font-bold">
                            <span className="text-emerald-200">다음 목표: {studentSummary.nextLevel.level}</span>
                            <span className="text-amber-300">{studentSummary.total} / {studentSummary.nextLevel.target} 달란트</span>
                          </div>
                          
                          <div className="w-full bg-emerald-900/60 h-3 rounded-full overflow-hidden p-0.5">
                            <div 
                              className="bg-gradient-to-r from-amber-400 to-amber-300 h-2 rounded-full transition-all duration-1000"
                              style={{ width: `${progressPercentage}%` }}
                            ></div>
                          </div>
                          
                          <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-emerald-700/50 text-xxs text-emerald-100">
                            <span>앞으로 <strong className="text-amber-300 font-black">{studentSummary.nextLevel.target - studentSummary.total} 달란트</strong> 더!</span>
                            <span className="bg-amber-400 text-emerald-950 font-bold px-1.5 py-0.5 rounded">
                              🎁 {studentSummary.nextLevel.reward.split(' + ')[0]}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-5 bg-emerald-900/40 p-3 rounded-2xl border border-emerald-600/40 text-center">
                          <span className="text-amber-300 text-xs font-black">👑 축하합니다! 플래티넘 등급을 돌파한 최고의 선한 청지기이십니다!</span>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="bg-white rounded-2xl p-8 border text-center text-slate-500">
                  <User size={36} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-bold">조회할 학생 프로필이 선택되지 않았습니다.</p>
                  <p className="text-xs text-slate-400 mt-1">상단의 학생 변경 메뉴에서 학생을 선택해주세요.</p>
                </div>
              )}

              {selectedStudentId && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setNewTxForm(prev => ({ ...prev, type: 'deposit', studentId: selectedStudentId, proofImage: '' }));
                      setShowAddTxModal(true);
                    }}
                    className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-emerald-600 hover:shadow transition-all text-left flex items-center gap-3 group"
                  >
                    <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      <PlusCircle size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400">달란트 쌓기</p>
                      <h4 className="font-extrabold text-sm text-slate-700">
                        {currentProfile.role === 'student' ? '신앙생활 실천 기록' : '교사/부모 직접 적립'}
                      </h4>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setNewTxForm(prev => ({ ...prev, type: 'withdrawal', studentId: selectedStudentId, proofImage: '' }));
                      setShowAddTxModal(true);
                    }}
                    className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-red-600 hover:shadow transition-all text-left flex items-center gap-3 group"
                  >
                    <div className="p-3 bg-red-50 text-red-700 rounded-xl group-hover:bg-red-600 group-hover:text-white transition-all">
                      <Smartphone size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400">경고/차감 기록</p>
                      <h4 className="font-extrabold text-sm text-slate-700">
                        {currentProfile.role === 'student' ? '스마트폰 절제 실패 등' : '교사/부모 벌점 차감'}
                      </h4>
                    </div>
                  </button>
                </div>
              )}

              {/* 보상 교환 표 */}
              <div className="bg-white rounded-2xl border p-5">
                <h3 className="font-black text-sm text-slate-700 mb-3 flex items-center gap-1">
                  <Gift size={16} className="text-amber-500" />
                  달란트 교환소 (보상 기준표)
                </h3>
                <div className="flex flex-col gap-2">
                  {REWARDS.map((rew, idx) => {
                    const isAchieved = selectedStudentId && studentSummary.total >= rew.target;
                    return (
                      <div 
                        key={idx} 
                        className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                          isAchieved 
                            ? 'bg-emerald-50/70 border-emerald-200 shadow-sm' 
                            : 'bg-slate-50/50 border-slate-100 opacity-70'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{rew.level.split(' ')[0]}</span>
                          <div>
                            <h4 className="font-extrabold text-xs text-slate-800">
                              {rew.level} <span className="text-xxs font-normal text-slate-400">({rew.target} 달란트 이상)</span>
                            </h4>
                            <p className="text-xxs text-emerald-700 font-bold mt-0.5">{rew.reward}</p>
                          </div>
                        </div>
                        {isAchieved ? (
                          <span className="bg-emerald-600 text-white text-3xs font-bold px-2 py-1 rounded-full flex items-center gap-0.5">
                            달성 완료!
                          </span>
                        ) : (
                          <span className="text-3xs text-slate-400 font-medium">
                            {selectedStudentId ? `${rew.target - studentSummary.total}달란트 남음` : '조회 대기'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xxs text-slate-400 mt-3 italic leading-relaxed text-center">
                  ※ 보상은 학기별 1회 교환 가능하며, 교환 후 달란트 잔액은 0으로 초기화됩니다. 교사 승인 후 진행됩니다.
                </p>
              </div>

            </div>
          )}

          {/* 탭 2: 통장 내역 */}
          {tab === 'passbook' && (
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col">
              
              <div className="bg-amber-100 border-b border-amber-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-8 bg-amber-500 rounded"></div>
                  <div>
                    <h3 className="font-extrabold text-sm text-amber-900">하나님의 선한 청지기 경주 통장 입출금 내역</h3>
                    <p className="text-xxs text-amber-700">인증 확인된 실천 내역과 누적 잔액이 기록되는 공식 가상 장부입니다.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xxs text-amber-800 font-semibold block">현재 승인 잔액</span>
                    <span className="font-black text-base text-amber-950">{selectedStudentId ? `${studentSummary.total} 달란트` : '0 달란트'}</span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-500 border-b text-xxs font-black tracking-wider uppercase">
                      <th className="py-3 px-4 w-28">날짜</th>
                      <th className="py-3 px-4">입출금 실천 내용</th>
                      <th className="py-3 px-4 text-center w-16">증빙 사진</th>
                      <th className="py-3 px-4 text-center w-20">입금 점수</th>
                      <th className="py-3 px-4 text-center w-20">출금 점수</th>
                      <th className="py-3 px-4 text-center w-24">누적 합계</th>
                      <th className="py-3 px-4 text-center w-16">교사 확인</th>
                      <th className="py-3 px-4 text-center w-16">부모 확인</th>
                      {currentProfile.role === 'teacher' && <th className="py-3 px-4 text-center w-12">삭제</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs">
                    {selectedStudentId && studentSummary.list.length > 0 ? (
                      studentSummary.list.map((tx) => (
                        <tr key={tx.id} className={`hover:bg-slate-50/80 transition-colors ${tx.id === 'initial_signup_points' ? 'bg-amber-50/20 font-bold text-amber-950' : ''}`}>
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap flex items-center gap-1.5 font-medium">
                            <Calendar size={12} className="text-slate-400" />
                            {tx.date}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">
                            <span className={`text-xxs font-bold bg-emerald-50 px-1.5 py-0.5 rounded mr-1.5 ${tx.id === 'initial_signup_points' ? 'text-amber-800 bg-amber-100' : 'text-emerald-700'}`}>
                              {tx.category}
                            </span>
                            {tx.title}
                          </td>
                          
                          {/* 증빙 사진 컬럼 */}
                          <td className="py-3 px-4 text-center">
                            {tx.proofImage ? (
                              <button 
                                onClick={() => setViewerImage(tx.proofImage)}
                                className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-1 rounded border border-indigo-200 transition-colors text-xxs font-semibold"
                              >
                                <img src={tx.proofImage} alt="thumbnail" className="w-5 h-5 rounded object-cover" />
                                <span>보기</span>
                              </button>
                            ) : (
                              <span className="text-slate-300 text-3xs">-</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center font-black text-indigo-600 whitespace-nowrap">
                            {tx.type === 'deposit' ? `+${tx.points}` : ''}
                          </td>
                          <td className="py-3 px-4 text-center font-black text-red-600 whitespace-nowrap">
                            {tx.type === 'withdrawal' ? `-${tx.points}` : ''}
                          </td>
                          <td className="py-3 px-4 text-center font-black text-slate-800 whitespace-nowrap bg-amber-50/30">
                            {tx.teacherCheck ? `${tx.runningBalance} 달란트` : <span className="text-xxs font-normal text-slate-400">승인 대기</span>}
                          </td>
                          
                          <td className="py-3 px-4 text-center">
                            {tx.id === 'initial_signup_points' ? (
                              <span className="text-xxs text-emerald-600 font-bold bg-emerald-100/50 px-2 py-0.5 rounded">자동승인</span>
                            ) : (
                              <button
                                onClick={() => handleToggleCheck(tx.id, 'teacher')}
                                disabled={currentProfile.role !== 'teacher'}
                                className={`p-1.5 rounded transition-all ${
                                  tx.teacherCheck 
                                    ? 'text-emerald-600 bg-emerald-50' 
                                    : 'text-slate-300 bg-slate-100 hover:text-slate-500'
                                } ${currentProfile.role !== 'teacher' ? 'cursor-not-allowed' : ''}`}
                                title={tx.teacherCheck ? '승인 완료' : '대기중'}
                              >
                                <CheckCircle size={16} fill={tx.teacherCheck ? "currentColor" : "none"} className={tx.teacherCheck ? "text-white" : ""} />
                              </button>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            {tx.id === 'initial_signup_points' ? (
                              <span className="text-xxs text-indigo-600 font-bold bg-indigo-100/50 px-2 py-0.5 rounded">자동승인</span>
                            ) : (
                              <button
                                onClick={() => handleToggleCheck(tx.id, 'parent')}
                                disabled={currentProfile.role !== 'parent'}
                                className={`p-1.5 rounded transition-all ${
                                  tx.parentCheck 
                                    ? 'text-indigo-600 bg-indigo-50' 
                                    : 'text-slate-300 bg-slate-100 hover:text-indigo-500'
                                } ${currentProfile.role !== 'parent' ? 'cursor-not-allowed' : ''}`}
                                title={tx.parentCheck ? '부모님 확인 완료' : '대기중'}
                              >
                                <Heart size={16} fill={tx.parentCheck ? "currentColor" : "none"} />
                              </button>
                            )}
                          </td>

                          {currentProfile.role === 'teacher' && (
                            <td className="py-3 px-4 text-center">
                              {tx.id !== 'initial_signup_points' && (
                                <button
                                  onClick={() => handleDeleteTx(tx.id)}
                                  className="text-red-400 hover:text-red-600 p-1"
                                  title="삭제"
                                >
                                  <XCircle size={15} />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={currentProfile.role === 'teacher' ? 9 : 8} className="py-12 px-4 text-center text-slate-400">
                          <AlertCircle size={24} className="mx-auto mb-1.5 text-slate-300" />
                          <p className="font-bold">기록된 달란트 내역이 없습니다.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50 p-4 border-t border-slate-150 flex flex-col md:flex-row justify-between items-center gap-3 text-xxs text-slate-400">
                <span>* '교사 확인' 체크가 완료되어야 최종 잔액(영적 재산)으로 인정 및 정산됩니다.</span>
                <span className="font-medium text-slate-500">
                  누적 보너스 포함 입금: {studentSummary.depositSum} 달란트 | 승인 누적 감점: {studentSummary.withdrawSum} 달란트
                </span>
              </div>
            </div>
          )}

          {/* 탭 3: 기준표 */}
          {tab === 'criteria' && (
            <div className="flex flex-col gap-4">
              
              <div className="bg-white rounded-2xl border p-5">
                <div className="border-b pb-3 mb-4">
                  <h3 className="font-black text-base text-slate-800 flex items-center gap-1.5">
                    <CheckCircle className="text-emerald-600" size={18} />
                    달란트 입금(적립) 기준표
                  </h3>
                  <p className="text-xxs text-slate-400 mt-0.5">실천한 신앙 항목에 따라 다음 보상 점수가 입금됩니다.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(
                    ACTIVITY_CRITERIA.deposit.reduce((acc, curr) => {
                      if (!acc[curr.category]) acc[curr.category] = [];
                      acc[curr.category].push(curr);
                      return acc;
                    }, {})
                  ).map(([cat, items]) => (
                    <div key={cat} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <h4 className="font-black text-xs text-emerald-800 mb-2 border-b border-emerald-100 pb-1 flex justify-between items-center">
                        <span>{cat}</span>
                        <span className="text-3xs bg-emerald-100 px-1.5 py-0.5 rounded font-normal text-emerald-700">입금 항목</span>
                      </h4>
                      <div className="flex flex-col gap-1.5">
                        {items.map(item => (
                          <div key={item.id} className="flex justify-between items-center text-xxs">
                            <span className="text-slate-600 font-medium">{item.title}</span>
                            <span className="font-black text-indigo-600 shrink-0">
                              {item.points > 0 ? `+${item.points} 점` : '상황별 적용'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border p-5">
                <div className="border-b pb-3 mb-4">
                  <h3 className="font-black text-base text-slate-800 flex items-center gap-1.5">
                    <XCircle className="text-red-500" size={18} />
                    달란트 출금(차감/경고) 기준표
                  </h3>
                  <p className="text-xxs text-slate-400 mt-0.5">지정된 생활 규칙이나 주님을 기쁘시게 하지 못할 때 적용됩니다.</p>
                </div>

                <div className="bg-red-50/30 rounded-xl p-3 border border-red-100">
                  <div className="flex flex-col gap-2">
                    {ACTIVITY_CRITERIA.withdrawal.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-xxs border-b border-red-100/50 pb-2 last:border-none last:pb-0">
                        <div>
                          <span className="bg-red-100 text-red-800 font-black px-1.5 py-0.5 rounded mr-2 text-3xs">
                            {item.category}
                          </span>
                          <span className="text-slate-700 font-bold">{item.title}</span>
                        </div>
                        <span className="font-black text-red-600">
                          {item.points > 0 ? `-${item.points} 점` : '상황별 결정'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* 탭 4: 교사 전용 관리실 */}
          {tab === 'admin' && currentProfile.role === 'teacher' && (
            <div className="flex flex-col gap-4">
              
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white border rounded-2xl p-3.5">
                  <span className="text-3xs font-bold text-slate-400 block mb-1">총 등록 학생수</span>
                  <span className="text-xl font-black text-slate-800">{studentProfiles.length}명</span>
                </div>
                <div className="bg-white border rounded-2xl p-3.5">
                  <span className="text-3xs font-bold text-slate-400 block mb-1">교사 미승인 내역</span>
                  <span className="text-xl font-black text-amber-600 animate-pulse">{pendingTeacherApprovalsCount}건</span>
                </div>
                <div className="bg-white border rounded-2xl p-3.5">
                  <span className="text-3xs font-bold text-slate-400 block mb-1">전체 교사/부모수</span>
                  <span className="text-xl font-black text-slate-800">
                    {profiles.filter(p => p.role !== 'student').length}명
                  </span>
                </div>
              </div>

              {/* 개편: 교사용 신속 입출금 등록기 (입출금 통합 및 카메라 추가) */}
              <div className="bg-emerald-50/50 border border-emerald-200 rounded-3xl p-5 shadow-sm">
                <h3 className="font-black text-sm text-emerald-900 mb-1 flex items-center gap-1.5">
                  <PlusCircle size={18} className="text-emerald-700" />
                  교사 전용 신속 달란트 입출금(±) 등록기
                </h3>
                <p className="text-xxs text-emerald-800/80 mb-4">
                  교사 권한으로 대시보드 이동 없이 즉각적으로 특정 학생에게 입출금(달란트 가감)을 부과하고 증빙사진도 자동 업로드합니다.
                </p>

                <form onSubmit={handleAdminQuickTxSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-3xs font-bold text-slate-500 mb-1">학생 지정</label>
                    <select
                      required
                      value={adminQuickTx.studentId}
                      onChange={(e) => setAdminQuickTx(prev => ({ ...prev, studentId: e.target.value }))}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none"
                    >
                      <option value="">-- 학생 선택 --</option>
                      {studentProfiles.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.dept} {s.grade}학년)</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-3xs font-bold text-slate-500 mb-1">구분 선택</label>
                    <select
                      value={adminQuickTx.type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        setAdminQuickTx(prev => ({ 
                          ...prev, 
                          type: newType,
                          itemId: newType === 'deposit' ? ACTIVITY_CRITERIA.deposit[0].id : ACTIVITY_CRITERIA.withdrawal[0].id
                        }));
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none"
                    >
                      <option value="deposit">📈 달란트 부여 (입금)</option>
                      <option value="withdrawal">📉 달란트 차감 (출금)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-3xs font-bold text-slate-500 mb-1">실천 항목 선택</label>
                    <select
                      value={adminQuickTx.itemId}
                      onChange={(e) => setAdminQuickTx(prev => ({ ...prev, itemId: e.target.value }))}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none"
                    >
                      {(adminQuickTx.type === 'deposit' ? ACTIVITY_CRITERIA.deposit : ACTIVITY_CRITERIA.withdrawal).map(item => (
                        <option key={item.id} value={item.id}>
                          {item.title} ({item.points > 0 ? `${adminQuickTx.type === 'deposit' ? '+' : '-'}${item.points}점` : '직접 입력'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 커스텀 내역 입력 창 */}
                  {(adminQuickTx.itemId === 'custom_in' || adminQuickTx.itemId === 'custom_out') && (
                    <div className="md:col-span-4 grid grid-cols-3 gap-2 bg-amber-50 p-3 rounded-xl border border-amber-200">
                      <div className="col-span-2">
                        <label className="block text-3xs font-bold text-amber-800 mb-1">사유 직접 입력</label>
                        <input
                          type="text"
                          required
                          placeholder="사유를 자세히 적어주세요."
                          value={adminQuickTx.customTitle}
                          onChange={(e) => setAdminQuickTx(prev => ({ ...prev, customTitle: e.target.value }))}
                          className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-3xs font-bold text-amber-800 mb-1">달란트 포인트</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={adminQuickTx.customPoints}
                          onChange={(e) => setAdminQuickTx(prev => ({ ...prev, customPoints: Number(e.target.value) }))}
                          className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* 신속 입출금 사진 촬영/업로드 */}
                  <div className="md:col-span-3 flex items-center gap-3 bg-slate-100/50 p-2.5 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => quickFileInputRef.current.click()}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xxs font-black py-2 px-3 rounded-lg flex items-center gap-1.5 shrink-0 shadow-sm"
                    >
                      <Camera size={14} />
                      증빙 사진 촬영 / 첨부
                    </button>
                    <input 
                      type="file" 
                      ref={quickFileInputRef}
                      accept="image/*" 
                      capture="environment" 
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, (base64) => setAdminQuickTx(prev => ({ ...prev, proofImage: base64 })))}
                    />
                    
                    <div className="flex-1 min-w-0">
                      {adminQuickTx.proofImage ? (
                        <div className="flex items-center gap-2">
                          <img src={adminQuickTx.proofImage} alt="preview" className="w-8 h-8 rounded object-cover border border-indigo-300 shrink-0" />
                          <span className="text-3xs text-emerald-800 font-bold truncate">사진 등록 완료!</span>
                          <button 
                            type="button" 
                            onClick={() => setAdminQuickTx(prev => ({ ...prev, proofImage: '' }))}
                            className="text-red-500 hover:text-red-700 text-3xs underline shrink-0 font-medium"
                          >
                            삭제
                          </button>
                        </div>
                      ) : (
                        <span className="text-3xs text-slate-400">등록된 사진 증빙 없음</span>
                      )}
                    </div>
                    {isCompresing && <span className="text-3xs text-indigo-600 animate-pulse font-bold">압축 중...</span>}
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-1"
                    >
                      <PlusCircle size={14} />
                      장부 기입 확정
                    </button>
                  </div>
                </form>
              </div>

              {/* 대기 상태 입출금 확인 큐 */}
              <div className="bg-white rounded-2xl border p-5">
                <h3 className="font-black text-sm text-slate-800 mb-3 flex items-center gap-1.5">
                  <Clock size={16} className="text-amber-500" />
                  실시간 교사 확인(승인) 대기 내역
                </h3>

                <div className="divide-y max-h-96 overflow-y-auto">
                  {transactions.filter(t => !t.teacherCheck).length > 0 ? (
                    transactions.filter(t => !t.teacherCheck).map(tx => (
                      <div key={tx.id} className="py-3 flex items-center justify-between gap-2 text-xs">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded text-3xs">
                              {tx.studentName}
                            </span>
                            <span className="text-slate-400 text-3xs">{tx.date}</span>
                            {tx.proofImage && <span className="text-indigo-600 font-bold text-3xs bg-indigo-50 px-1 rounded flex items-center gap-0.5"><ImageIcon size={10}/>사진 포함</span>}
                          </div>
                          <p className="font-black text-slate-800 mt-1">
                            <span className="text-emerald-700 mr-1">[{tx.category}]</span>
                            {tx.title}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`font-black ${tx.type === 'deposit' ? 'text-indigo-600' : 'text-red-600'}`}>
                            {tx.type === 'deposit' ? `+${tx.points}` : `-${tx.points}`}달란트
                          </span>
                          
                          <button
                            onClick={() => handleToggleCheck(tx.id, 'teacher')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1.5 rounded-lg text-xxs shadow transition-all shrink-0"
                          >
                            원클릭 확인
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-400">
                      <CheckCircle size={20} className="mx-auto mb-1 text-emerald-500" />
                      <p className="font-bold">현재 확인 대기 중인 항목이 없습니다.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 전체 명부 */}
              <div className="bg-white rounded-2xl border p-5">
                <h3 className="font-black text-sm text-slate-800 mb-3 flex items-center gap-1.5">
                  <Users size={16} className="text-indigo-500" />
                  전체 학생 명부 및 실시간 정산
                </h3>

                <div className="flex flex-col gap-2">
                  {studentProfiles.map(student => {
                    const studentTxs = transactions.filter(t => t.studentId === student.id && t.teacherCheck);
                    const totalBalance = 50 + studentTxs.reduce((sum, tx) => {
                      return sum + (tx.type === 'deposit' ? tx.points : -tx.points);
                    }, 0);

                    return (
                      <div key={student.id} className="p-3 border rounded-xl hover:border-slate-300 transition-all flex items-center justify-between">
                        <div>
                          <h4 className="font-black text-xs text-slate-800">
                            {student.name} <span className="text-xxs text-slate-400 font-normal">({student.dept} {student.grade}학년 / {student.gender})</span>
                          </h4>
                          <p className="text-3xs text-slate-400 mt-0.5">담임교사: {student.teacherName || '없음'}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-black text-emerald-700 text-xs">
                            {totalBalance} 달란트
                          </span>
                          <button
                            onClick={() => {
                              setSelectedStudentId(student.id);
                              setTab('dashboard');
                              showToast(`${student.name} 대시보드로 이동했습니다.`);
                            }}
                            className="p-1 px-2 border text-slate-500 rounded hover:bg-slate-50 text-3xs font-bold"
                          >
                            상세관리
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* 푸터 */}
      <footer className="mt-auto bg-slate-800 text-slate-400 border-t border-slate-700 py-6 text-center text-xs">
        <div className="max-w-4xl mx-auto px-4 flex flex-col gap-2">
          <p className="font-extrabold text-slate-200">✝ 무등교회 중고등부 하나님의 선한 청지기 경주</p>
          <p className="text-xxs text-slate-500">Stewardship Race Account Management System @ 2026</p>
          <div className="flex justify-center gap-3 text-xxs mt-2 text-slate-400">
            <span>1차 운영: 2026. 06. ~ 08.</span>
            <span>|</span>
            <span>2차 운영: 2026. 09. ~ 11.</span>
          </div>
        </div>
      </footer>

      {/* 모달 1: 가입 */}
      {showAddProfileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl duration-200">
            <div className="bg-slate-900 text-white p-5">
              <h3 className="font-black text-base">새 경주 통장 계정 만들기</h3>
              <p className="text-xxs text-slate-400 mt-1">온라인 경주 장부를 개설할 신규 사용자를 생성합니다.</p>
            </div>
            
            <form onSubmit={handleCreateProfile} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-xxs font-bold text-slate-400 mb-1">사용자 분류</label>
                <div className="grid grid-cols-3 gap-1">
                  {['student', 'teacher', 'parent'].map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setNewProfileForm(prev => ({ 
                        ...prev, 
                        role,
                        dept: role === 'student' ? '고등부' : role === 'teacher' ? '교사' : '학부모',
                        grade: role === 'student' ? '1' : role === 'teacher' ? '교사' : '학부모'
                      }))}
                      className={`py-2 text-xxs font-bold rounded-lg border transition-all ${
                        newProfileForm.role === role 
                          ? 'border-slate-800 bg-slate-900 text-white' 
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {role === 'student' ? '학생' : role === 'teacher' ? '교사' : '학부모'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xxs font-bold text-slate-400 mb-1">실명 (이름)</label>
                <input
                  type="text"
                  required
                  placeholder="예: 김민우"
                  value={newProfileForm.name}
                  onChange={(e) => setNewProfileForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              {newProfileForm.role === 'student' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xxs font-bold text-slate-400 mb-1">부서구분</label>
                      <select
                        value={newProfileForm.dept}
                        onChange={(e) => setNewProfileForm(prev => ({ ...prev, dept: e.target.value }))}
                        className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none"
                      >
                        <option value="중등부">중등부</option>
                        <option value="고등부">고등부</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xxs font-bold text-slate-400 mb-1">학년</label>
                      <select
                        value={newProfileForm.grade}
                        onChange={(e) => setNewProfileForm(prev => ({ ...prev, grade: e.target.value }))}
                        className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none"
                      >
                        <option value="1">1학년</option>
                        <option value="2">2학년</option>
                        <option value="3">3학년</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xxs font-bold text-slate-400 mb-1">형제/자매</label>
                      <select
                        value={newProfileForm.gender}
                        onChange={(e) => setNewProfileForm(prev => ({ ...prev, gender: e.target.value }))}
                        className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none"
                      >
                        <option value="형제">형제</option>
                        <option value="자매">자매</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xxs font-bold text-slate-400 mb-1">분반 교사 이름</label>
                      <input
                        type="text"
                        placeholder="예: 이진호 교사"
                        value={newProfileForm.teacherName}
                        onChange={(e) => setNewProfileForm(prev => ({ ...prev, teacherName: e.target.value }))}
                        className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>
                  </div>
                </>
              )}

              {newProfileForm.role === 'parent' && (
                <div>
                  <label className="block text-xxs font-bold text-slate-400 mb-1">연결할 자녀 이름</label>
                  <input
                    type="text"
                    required
                    placeholder="예: 김민우"
                    value={newProfileForm.childName}
                    onChange={(e) => setNewProfileForm(prev => ({ ...prev, childName: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                  <p className="text-3xs text-slate-400 mt-1">자녀의 이름이 학생 프로필로 먼저 등록되어 있어야 연결 조회가 작동합니다.</p>
                </div>
              )}

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProfileModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow transition-all"
                >
                  등록 및 로그인
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 모달 2: 트랜잭션 등록 (스마트폰 즉석촬영 업로드 포함) */}
      {showAddTxModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl duration-200">
            <div className={`p-5 text-white ${newTxForm.type === 'deposit' ? 'bg-emerald-800' : 'bg-red-800'}`}>
              <h3 className="font-black text-base flex items-center gap-1.5">
                {newTxForm.type === 'deposit' ? <PlusCircle size={18} /> : <XCircle size={18} />}
                {newTxForm.type === 'deposit' ? '신앙 성장 실천 등록' : '차감/경고 내역 등록'}
              </h3>
              <p className="text-xxs text-emerald-100/80 mt-1">
                {currentProfile.role === 'student' 
                  ? (newTxForm.type === 'deposit' ? '실천 행동과 스마트폰 촬영 증빙사진을 등록하여 달란트를 신청하세요.' : '잘못된 생활 습관 및 관련 사진을 입력하고 승인을 구합니다.')
                  : (newTxForm.type === 'deposit' ? '선생님/부모님 권한으로 학생에게 즉각 달란트와 증빙 사진을 부여합니다.' : '선생님/부모님 권한으로 즉시 벌점을 부과하고 사진을 기입합니다.')}
              </p>
            </div>

            <form onSubmit={handleCreateTransaction} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-xxs font-bold text-slate-400 mb-1">대상 청지기</label>
                <div className="bg-slate-100 px-3 py-2 rounded-xl font-bold text-xs text-slate-700">
                  {currentProfile.role === 'student' 
                    ? `${currentProfile.name} 학생` 
                    : `${profiles.find(p => p.id === selectedStudentId)?.name || '선택 없음'} 학생`}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xxs font-bold text-slate-400 mb-1">실천 날짜</label>
                  <input
                    type="date"
                    required
                    value={newTxForm.date}
                    onChange={(e) => setNewTxForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-slate-400 mb-1">구분 변경</label>
                  <select
                    value={newTxForm.type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setNewTxForm(prev => ({ 
                        ...prev, 
                        type: newType, 
                        itemId: newType === 'deposit' ? ACTIVITY_CRITERIA.deposit[0].id : ACTIVITY_CRITERIA.withdrawal[0].id 
                      }));
                    }}
                    className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  >
                    <option value="deposit">📈 입금 (적립)</option>
                    <option value="withdrawal">📉 출금 (차감)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xxs font-bold text-slate-400 mb-1">실천 항목 선택</label>
                <select
                  value={newTxForm.itemId}
                  onChange={(e) => setNewTxForm(prev => ({ ...prev, itemId: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600 text-slate-700 font-medium"
                >
                  {(newTxForm.type === 'deposit' ? ACTIVITY_CRITERIA.deposit : ACTIVITY_CRITERIA.withdrawal).map(item => (
                    <option key={item.id} value={item.id}>
                      [{item.category}] {item.title} {item.points > 0 ? `(${newTxForm.type === 'deposit' ? '+' : '-'}${item.points}달란트)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {(newTxForm.itemId === 'custom_in' || newTxForm.itemId === 'custom_out') && (
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 flex flex-col gap-3">
                  <div>
                    <label className="block text-xxs font-bold text-amber-800 mb-1">직접 입력 제목</label>
                    <input
                      type="text"
                      required
                      placeholder="내용을 적어주세요."
                      value={newTxForm.customTitle}
                      onChange={(e) => setNewTxForm(prev => ({ ...prev, customTitle: e.target.value }))}
                      className="w-full border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xxs font-bold text-amber-800 mb-1">지정할 달란트 포인트</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newTxForm.customPoints}
                      onChange={(e) => setNewTxForm(prev => ({ ...prev, customPoints: e.target.value }))}
                      className="w-24 border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none bg-white"
                    />
                  </div>
                </div>
              )}

              {/* 증빙 사진 입력 필드 */}
              <div>
                <label className="block text-xxs font-bold text-slate-400 mb-1.5 flex items-center gap-1">
                  <Camera size={14} className="text-slate-500" />
                  스마트폰 증빙 사진 업로드
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current.click()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xxs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-md transition-colors"
                  >
                    <Camera size={16} />
                    사진 찍기 / 업로드
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    capture="environment" // 모바일 디바이스에서 카메라 우선 작동 트리거
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, (base64) => setNewTxForm(prev => ({ ...prev, proofImage: base64 })))}
                  />
                  {isCompresing && <span className="text-xxs text-indigo-600 animate-pulse font-bold">리사이징 압축 중...</span>}
                </div>

                {newTxForm.proofImage && (
                  <div className="mt-3 bg-slate-100 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img src={newTxForm.proofImage} alt="uploaded preview" className="w-12 h-12 rounded-lg object-cover border border-indigo-300" />
                      <span className="text-xxs text-emerald-800 font-bold">증빙 자료가 저장되었습니다.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewTxForm(prev => ({ ...prev, proofImage: '' }))}
                      className="text-red-500 hover:text-red-700 p-1.5 bg-white rounded-lg border shadow-sm transition-all"
                      title="사진 삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div className="text-xxs text-slate-400 leading-normal bg-slate-50 p-2.5 rounded-xl">
                {currentProfile.role === 'student' 
                  ? '※ 학생이 등록한 내역은 선생님이 "확인"한 시점부터 실시간 합계에 정식 반영됩니다.' 
                  : '※ 선생님/부모님 권한으로 직접 등록하는 내역은 즉시 승인 처리되어 통장에 즉각 반영됩니다.'}
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTxModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2.5 text-white font-bold text-xs rounded-xl shadow transition-all ${
                    newTxForm.type === 'deposit' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-red-700 hover:bg-red-800'
                  }`}
                >
                  기록 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- 모달 3: 증빙 사진 확대 전용 팝업 뷰어 (Viewer) --- */}
      {viewerImage && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setViewerImage(null)}
        >
          <div className="relative max-w-lg w-full bg-white rounded-3xl overflow-hidden shadow-2xl p-3 flex flex-col items-center">
            <button
              onClick={() => setViewerImage(null)}
              className="absolute top-4 right-4 bg-slate-900 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm hover:scale-115 transition-transform"
            >
              ✕
            </button>
            <div className="text-slate-800 font-black text-xs py-2">✝ 신앙 성장 경주 실시간 사진 증빙 자료</div>
            <img src={viewerImage} alt="Stewardship Race Proof" className="w-full max-h-[70vh] object-contain rounded-2xl border" />
            <p className="text-slate-400 text-3xs mt-2 italic text-center">화면 아무 데나 클릭하시면 창이 닫힙니다.</p>
          </div>
        </div>
      )}

    </div>
  );
}