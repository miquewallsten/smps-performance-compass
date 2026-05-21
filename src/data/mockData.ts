import { User, SupervisorAssignment, Evaluation, CURRENT_PERIOD } from '@/types';

export const MOCK_USERS: User[] = [
  // Super usuario oculto
  { id: 'u0', name: 'Super Admin', email: 'lab@bowdot.com', position: 'socio', isAdmin: true, isActive: true, password: '3791', isSuperUser: true },

  // === LEGAL ===
  // Socios
  { id: 'u1', name: 'Lic. Carlos Mendoza', email: 'cmendoza@smps.com', position: 'socio', isAdmin: true, isActive: true, password: '1234', isManagingPartner: true },
  { id: 'u2', name: 'Lic. Patricia Salinas', email: 'psalinas@smps.com', position: 'socio', isAdmin: false, isActive: true, password: '1234' },
  // Salary Partner
  { id: 'u17', name: 'Lic. Andrés Beltrán', email: 'abeltran@smps.com', position: 'salary_partner', isAdmin: false, isActive: true, password: '1234' },
  // Asociados Sr
  { id: 'u3', name: 'Lic. Roberto Figueroa', email: 'rfigueroa@smps.com', position: 'asociado_sr', isAdmin: false, isActive: true, password: '1234' },
  // Asociados Mid
  { id: 'u4', name: 'Lic. Ana Lucía Torres', email: 'atorres@smps.com', position: 'asociado_mid', isAdmin: false, isActive: true, password: '1234' },
  // Asociados Jr
  { id: 'u13', name: 'Lic. Emilio Castañeda', email: 'ecastaneda@smps.com', position: 'asociado_jr', isAdmin: false, isActive: true, password: '1234' },
  // Abogados (mapped to Pasante con Carrera)
  { id: 'u5', name: 'Lic. Diego Ramírez', email: 'dramirez@smps.com', position: 'pasante_carrera', isAdmin: false, isActive: true, password: '1234' },
  { id: 'u6', name: 'Lic. Mariana Vega', email: 'mvega@smps.com', position: 'pasante_carrera', isAdmin: false, isActive: true, password: '1234' },
  // Pasantes Corporativos
  { id: 'u7', name: 'Laura Hernández', email: 'lhernandez@smps.com', position: 'pasante_corporativo', isAdmin: false, isActive: true, password: '1234' },
  { id: 'u8', name: 'Miguel Ángel López', email: 'malopez@smps.com', position: 'pasante_corporativo', isAdmin: false, isActive: true, password: '1234' },

  // === ADMINISTRATIVO ===
  // Director
  { id: 'u14', name: 'Ing. Rafael Domínguez', email: 'rdominguez@smps.com', position: 'director', isAdmin: false, isActive: true, password: '1234' },
  // Gerente
  { id: 'u15', name: 'Lic. Verónica Campos', email: 'vcampos@smps.com', position: 'gerente', isAdmin: false, isActive: true, password: '1234' },
  // Coordinador
  { id: 'u9', name: 'C.P. Sandra Morales', email: 'smorales@smps.com', position: 'coordinador', isAdmin: false, isActive: true, password: '1234' },
  // Analista
  { id: 'u10', name: 'Fernando Ruiz', email: 'fruiz@smps.com', position: 'analista', isAdmin: false, isActive: true, password: '1234' },
  // Asistente
  { id: 'u11', name: 'Gabriela Ortiz', email: 'gortiz@smps.com', position: 'asistente', isAdmin: false, isActive: true, password: '1234' },
  { id: 'u12', name: 'Alejandra Núñez', email: 'anunez@smps.com', position: 'asistente', isAdmin: false, isActive: false, password: '1234' },
  // Archivo y Soporte
  { id: 'u16', name: 'José Luis Paredes', email: 'jparedes@smps.com', position: 'archivo_soporte', isAdmin: false, isActive: true, password: '1234' },
];

export const MOCK_ASSIGNMENTS: SupervisorAssignment[] = [
  { id: 'a1', employeeId: 'u1', supervisorId: 'u2', period: CURRENT_PERIOD },
  { id: 'a2', employeeId: 'u2', supervisorId: 'u1', period: CURRENT_PERIOD },
  { id: 'a3', employeeId: 'u3', supervisorId: 'u1', period: CURRENT_PERIOD },
  { id: 'a4', employeeId: 'u4', supervisorId: 'u2', period: CURRENT_PERIOD },
  { id: 'a5', employeeId: 'u5', supervisorId: 'u3', period: CURRENT_PERIOD },
  { id: 'a6', employeeId: 'u5', supervisorId: 'u1', period: CURRENT_PERIOD },
  { id: 'a7', employeeId: 'u6', supervisorId: 'u4', period: CURRENT_PERIOD },
  { id: 'a8', employeeId: 'u6', supervisorId: 'u2', period: CURRENT_PERIOD },
  { id: 'a9', employeeId: 'u7', supervisorId: 'u3', period: CURRENT_PERIOD },
  { id: 'a10', employeeId: 'u7', supervisorId: 'u4', period: CURRENT_PERIOD },
  { id: 'a11', employeeId: 'u8', supervisorId: 'u3', period: CURRENT_PERIOD },
  { id: 'a12', employeeId: 'u9', supervisorId: 'u14', period: CURRENT_PERIOD },
  { id: 'a13', employeeId: 'u10', supervisorId: 'u9', period: CURRENT_PERIOD },
  { id: 'a14', employeeId: 'u10', supervisorId: 'u14', period: CURRENT_PERIOD },
  { id: 'a15', employeeId: 'u11', supervisorId: 'u15', period: CURRENT_PERIOD },
  { id: 'a16', employeeId: 'u11', supervisorId: 'u9', period: CURRENT_PERIOD },
  { id: 'a17', employeeId: 'u13', supervisorId: 'u3', period: CURRENT_PERIOD },
  { id: 'a18', employeeId: 'u14', supervisorId: 'u1', period: CURRENT_PERIOD },
  { id: 'a19', employeeId: 'u15', supervisorId: 'u14', period: CURRENT_PERIOD },
  { id: 'a20', employeeId: 'u16', supervisorId: 'u15', period: CURRENT_PERIOD },
  // Old period
  { id: 'a21', employeeId: 'u5', supervisorId: 'u3', period: '2025-H2' },
  { id: 'a22', employeeId: 'u7', supervisorId: 'u3', period: '2025-H2' },
];

export const MOCK_EVALUATIONS: Evaluation[] = [
  {
    id: 'e1', evaluatorId: 'u5', evaluatedId: 'u5', period: '2025-H2', type: 'self',
    responses: [
      { questionId: 'pc1', score: 4 }, { questionId: 'pc2', score: 4 }, { questionId: 'pc3', score: 3 },
      { questionId: 'pc4', score: 4 }, { questionId: 'pc5', score: 4 }, { questionId: 'pc6', score: 3 },
      { questionId: 'pc7', score: 4 }, { questionId: 'pc8', score: 5 }, { questionId: 'pc9', score: 4 },
      { questionId: 'pc10', score: 4 }, { questionId: 'pc11', score: 3 }, { questionId: 'pc12', score: 4 },
      { questionId: 'pc13', score: 4 },
    ],
    comments: 'He mejorado mi investigación jurídica este semestre.',
    completedAt: '2025-12-15', totalScore: 76,
  },
  {
    id: 'e2', evaluatorId: 'u3', evaluatedId: 'u5', period: '2025-H2', type: 'supervisor',
    responses: [
      { questionId: 'pc1', score: 4 }, { questionId: 'pc2', score: 3 }, { questionId: 'pc3', score: 3 },
      { questionId: 'pc4', score: 4 }, { questionId: 'pc5', score: 4 }, { questionId: 'pc6', score: 4 },
      { questionId: 'pc7', score: 3 }, { questionId: 'pc8', score: 4 }, { questionId: 'pc9', score: 4 },
      { questionId: 'pc10', score: 3 }, { questionId: 'pc11', score: 3 }, { questionId: 'pc12', score: 4 },
      { questionId: 'pc13', score: 4 },
    ],
    comments: 'Diego muestra compromiso consistente. Debe mejorar en el cumplimiento de plazos.',
    supervisorComments: 'Recomiendo asignarle casos más complejos para acelerar su desarrollo.',
    completedAt: '2025-12-18', totalScore: 72,
    feedbackCompleted: true, feedbackCompletedAt: '2025-12-20', feedbackCompletedBy: 'u3',
  },
  {
    id: 'e3', evaluatorId: 'u7', evaluatedId: 'u7', period: '2025-H2', type: 'self',
    responses: [
      { questionId: 'pco1', score: 4 }, { questionId: 'pco2', score: 5 }, { questionId: 'pco3', score: 4 },
      { questionId: 'pco4', score: 4 }, { questionId: 'pco5', score: 3 }, { questionId: 'pco6', score: 5 },
      { questionId: 'pco7', score: 4 }, { questionId: 'pco8', score: 4 }, { questionId: 'pco9', score: 4 },
      { questionId: 'pco10', score: 4 }, { questionId: 'pco11', score: 5 }, { questionId: 'pco12', score: 4 },
      { questionId: 'pco13', score: 5 }, { questionId: 'pco14', score: 4 },
    ],
    comments: 'Me siento muy comprometida con mi trabajo y he mejorado en organización.',
    completedAt: '2025-12-14', totalScore: 84,
  },
];
