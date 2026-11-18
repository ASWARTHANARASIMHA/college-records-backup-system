import { AcademicRecord, BackupRecord } from '../types';
import { computeSHA256 } from './crypto';
import { saveRecord, saveBackup, addLog, getAllRecords } from './db';

interface SeedItem {
  name: string;
  category: AcademicRecord['category'];
  department: string;
  academicYear: string;
  semester: string;
  type: string;
  contentStr: string;
  hasBackup: boolean;
  isDeleted?: boolean;
}

const SAMPLE_FILES: SeedItem[] = [
  {
    name: 'BTech_CSE_Sem6_Consolidated_GradeSheet_2024.csv',
    category: 'Examination Records',
    department: 'Computer Science & Engineering',
    academicYear: '2023-2024',
    semester: 'Semester VI',
    type: 'text/csv',
    contentStr: `RollNo,StudentName,Course_CS601,Course_CS602,Course_CS603,Course_CS604,SGPA,CGPA,ResultStatus
21CS001,Aarav Sharma,A+,A,O,A+,9.24,9.10,PASSED_FIRST_CLASS_DISTINCTION
21CS002,Bhavna Patel,A,B+,A,A,8.45,8.32,PASSED_FIRST_CLASS
21CS003,Chetan Verma,O,O,A+,O,9.80,9.75,PASSED_FIRST_CLASS_DISTINCTION
21CS004,Divya Menon,B+,A,B+,A,7.88,8.02,PASSED_FIRST_CLASS
21CS005,Eshan Kulkarni,A+,A+,A+,A,9.15,9.08,PASSED_FIRST_CLASS_DISTINCTION
21CS006,Farhan Akhtar,A,A,A,B+,8.20,8.15,PASSED_FIRST_CLASS
21CS007,Gauri Sundaram,O,A+,A+,O,9.65,9.50,PASSED_FIRST_CLASS_DISTINCTION
21CS008,Harshil Vora,B,B+,A,B+,7.30,7.52,PASSED_SECOND_CLASS
21CS009,Ishaan Roy,A+,O,A+,A+,9.40,9.35,PASSED_FIRST_CLASS_DISTINCTION
21CS010,Juhi Deshmukh,A,A+,A,A+,8.90,8.82,PASSED_FIRST_CLASS
# Verified by Office of the Controller of Examinations, 15-Oct-2024`,
    hasBackup: true
  },
  {
    name: 'Faculty_Confidential_Appraisal_Dr_R_Sharma.txt',
    category: 'Faculty Documents',
    department: 'Computer Science & Engineering',
    academicYear: '2023-2024',
    semester: 'Annual Assessment',
    type: 'text/plain',
    contentStr: `========================================================================
APEX INSTITUTE OF ENGINEERING & TECHNOLOGY
OFFICE OF THE DEAN (FACULTY AFFAIRS & DEVELOPMENT)
ANNUAL CONFIDENTIAL PERFORMANCE APPRAISAL REPORT
========================================================================

Faculty ID: FAC-CSE-2015-084
Faculty Name: Dr. Rajesh Sharma
Designation: Professor & Head of Department
Department: Computer Science & Engineering
Date of Appointment: 14-July-2015
Academic Year Evaluated: 2023-2024

SECTION 1: TEACHING PERFORMANCE & PEDAGOGY
- CS601: Distributed Systems & Cloud Infrastructure (Student Feedback: 4.88 / 5.0)
- CS802: Advanced Storage Area Networks & Disaster Recovery (Student Feedback: 4.92 / 5.0)
- Average Class Attendance: 91.4%
- Curriculum Revision: Introduced hands-on labs for Ceph, ZFS, and WebCrypto verification.

SECTION 2: RESEARCH & SPONSORED PROJECTS
- SCI / Scopus Indexed Journal Papers Published: 5
- Research Grants Sanctioned: INR 24,50,000 (DST-SERB Data Storage Resiliency Grant)
- Patents Filed / Granted: 2 (Provisional Patent: Multi-tier Hash Auditing in Distributed Backups)

SECTION 3: ADMINISTRATIVE & INSTITUTIONAL CONTRIBUTIONS
- Convener, NAAC Criterion IV Steering Committee
- Member, Autonomous Academic Council
- Overseeing High Performance Computing Cluster and Departmental SAN Storage

DEAN'S ENDORSEMENT & RATING:
Overall Grade: OUTSTANDING (Category A+)
Recommended for Continuation of Department Leadership & Research Incentive.

Signed: Dean (Academics & Faculty Affairs)
Timestamp: 2024-09-28 11:45:00 UTC`,
    hasBackup: true
  },
  {
    name: 'Biometric_Student_Attendance_Consolidated_Oct2024.csv',
    category: 'Attendance Sheets',
    department: 'Information Technology',
    academicYear: '2024-2025',
    semester: 'Semester VII',
    type: 'text/csv',
    contentStr: `RollNo,StudentName,TotalClasses,PresentDays,AbsentDays,AttendancePercentage,MedicalCondonation,Status
21IT101,Aaditya Nair,92,88,4,95.65%,No,Eligible
21IT102,Ananya Joshi,92,85,7,92.39%,No,Eligible
21IT103,Brijesh Gupta,92,72,20,78.26%,Yes (Approved),Eligible
21IT104,Chirag Reddy,92,60,32,65.21%,No,Detained_Under_Condonation_Limit
21IT105,Deepika Sen,92,90,2,97.82%,No,Eligible
21IT106,Gautam Bhat,92,83,9,90.21%,No,Eligible
21IT107,Hina Sheikh,92,87,5,94.56%,No,Eligible
21IT108,Irfan Malik,92,79,13,85.86%,No,Eligible
21IT109,Kavya Iyer,92,91,1,98.91%,No,Eligible
21IT110,Manish Rao,92,80,12,86.95%,No,Eligible
# Department Biometric Portal Sync Time: 31-Oct-2024 17:00:00`,
    hasBackup: true
  },
  {
    name: 'NAAC_Criterion_4_IT_Infrastructure_Storage_Audit.txt',
    category: 'Administrative & Accreditation',
    department: 'Office of the Registrar',
    academicYear: '2024-2025',
    semester: 'Accreditation Cycle 3',
    type: 'text/plain',
    contentStr: `CRITERION IV - INFRASTRUCTURE AND LEARNING RESOURCES
Metric 4.3.1: Institution frequently updates its IT facilities including Wi-Fi, Storage & Data Protection.

EXECUTIVE SUMMARY OF STORAGE ARCHITECTURE:
1. Centralized Data Storage: 120 TB High-Availability NAS Storage with ZFS RAID-Z2.
2. Departmental Academic Records Vault: Dedicated encrypted partition with automated snapshots.
3. Cryptographic Verification: Automated SHA-256 integrity audits scheduled across all semester mark-sheets and degree registries.
4. Disaster Recovery (DR) Protocol: Offsite differential backups maintained at Secondary Data Center with daily sync.
5. Campus Network Backbone: 10 Gbps redundant optical fiber linking all academic blocks.

AUDIT TEAM FINDINGS:
- Zero data loss incidents recorded over the past 5 academic years.
- Implemented tamper-evident hash logging conforming to ISO/IEC 27001 data integrity standards.
- RPO (Recovery Point Objective): < 15 minutes.
- RTO (Recovery Time Objective): < 5 minutes for core academic registrar databases.

Certified by: Director of Accreditation & Quality Assurance Cell (IQAC)`,
    hasBackup: false // Awaiting Backup initially!
  },
  {
    name: 'Autonomous_EndSem_Exam_Schedule_Winter_2024.pdf',
    category: 'Examination Records',
    department: 'Office of the Controller of Examinations',
    academicYear: '2024-2025',
    semester: 'Odd Semester 2024',
    type: 'application/pdf',
    // Realistic text representation inside PDF MIME
    contentStr: `%PDF-1.4
%âãÏÓ
1 0 obj
<< /Title (APEX INSTITUTE - WINTER 2024 EXAMINATION NOTIFICATION)
   /Author (Controller of Examinations)
   /Subject (Autonomous End-Semester Examination Timetable)
   /Creator (Examination Management System)
>>
endobj
2 0 obj
<< /Type /Catalog /Pages 3 0 R >>
endobj
3 0 obj
<< /Type /Pages /Kids [4 0 R] /Count 1 >>
endobj
4 0 obj
<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
5 0 obj
<< /Length 120 >>
stream
BT
/F1 14 Tf
72 720 Td
(APEX INSTITUTE OF TECHNOLOGY - AUTONOMOUS END-SEMESTER EXAMS WINTER 2024) Tj
0 -24 Td
(Date: 02-Dec-2024 to 20-Dec-2024 | Slot 1: 09:30 - 12:30 | Slot 2: 14:00 - 17:00) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000015 00000 n 
0000000180 00000 n 
0000000235 00000 n 
0000000298 00000 n 
0000000385 00000 n 
trailer
<< /Size 6 /Root 2 0 R >>
startxref
570
%%EOF`,
    hasBackup: true
  },
  {
    name: 'Student_Admission_Register_Batch_2024_2028.csv',
    category: 'Student Information',
    department: 'Office of the Registrar',
    academicYear: '2024-2025',
    semester: 'Semester I',
    type: 'text/csv',
    contentStr: `ApplicationNo,CandidateName,Branch,Quota,CET_Rank,12th_Percent,BloodGroup,ContactNumber
APP2024-001,Aditi Kothari,CSE,State Merit,412,96.4%,O+,9876543210
APP2024-002,Bipin Singhal,ECE,State Merit,854,94.2%,A+,9876543211
APP2024-003,Devendra Joshi,Mechanical,General,1420,91.8%,B+,9876543212
APP2024-004,Gargi Deshmukh,CSE,State Merit,310,97.5%,AB+,9876543213
APP2024-005,Himanshu Seth,IT,General,1105,92.6%,O-,9876543214
APP2024-006,Ishita Bansal,Civil,State Merit,2150,89.4%,A-,9876543215
APP2024-007,Kabir Chawla,CSE,All India JEE,580,95.8%,B-,9876543216
APP2024-008,Lavanya Iyer,ECE,State Merit,930,93.5%,O+,9876543217
# Certified Registrar Ledger Enrollment Database Entry Batch 2024-2028`,
    hasBackup: true,
    isDeleted: false
  }
];

export async function seedSampleRecordsIfEmpty(): Promise<boolean> {
  const existing = await getAllRecords(true);
  if (existing.length > 0) {
    return false; // Already has data
  }

  await forceSeedSampleRecords();
  return true;
}

export async function forceSeedSampleRecords(): Promise<void> {
  for (let i = 0; i < SAMPLE_FILES.length; i++) {
    const item = SAMPLE_FILES[i];
    const blob = new Blob([item.contentStr], { type: item.type });
    const sha256 = await computeSHA256(blob);
    const now = new Date(Date.now() - (SAMPLE_FILES.length - i) * 3600000).toISOString();

    const recordId = `rec_${Date.now()}_${i}`;

    const record: AcademicRecord = {
      id: recordId,
      name: item.name,
      category: item.category,
      department: item.department,
      academicYear: item.academicYear,
      semester: item.semester,
      size: blob.size,
      type: item.type,
      uploadDate: now,
      lastModified: now,
      sha256: sha256,
      content: blob,
      isDeleted: item.isDeleted || false,
      deletedAt: item.isDeleted ? now : undefined,
      tampered: false
    };

    await saveRecord(record);

    await addLog({
      action: 'FILE_UPLOAD',
      description: `Uploaded record '${item.name}' into ${item.category}`,
      status: 'SUCCESS',
      fileName: item.name,
      details: `File size: ${blob.size} bytes | SHA-256: ${sha256.substring(0, 16)}...`,
      admin: 'System Initializer'
    });

    if (item.hasBackup) {
      const backupId = `bkp_${Date.now()}_${i}`;
      // Separate copy of the blob
      const backupBlob = new Blob([item.contentStr], { type: item.type });
      const backupSha = await computeSHA256(backupBlob);

      const backup: BackupRecord = {
        id: backupId,
        recordId: recordId,
        fileName: item.name,
        category: item.category,
        department: item.department,
        version: 1,
        backupType: 'MANUAL',
        timestamp: new Date(new Date(now).getTime() + 120000).toISOString(),
        size: backupBlob.size,
        sha256: backupSha,
        content: backupBlob,
        status: 'SUCCESS',
        notes: 'Initial institutional primary backup baseline archive'
      };

      await saveBackup(backup);

      await addLog({
        action: 'MANUAL_BACKUP',
        description: `Created backup v1 for '${item.name}'`,
        status: 'SUCCESS',
        fileName: item.name,
        details: `Backup archive verified with SHA-256: ${backupSha.substring(0, 16)}...`,
        admin: 'System Initializer'
      });
    }
  }

  await addLog({
    action: 'SAMPLE_DATA_SEEDED',
    description: 'Seeded sample academic records and backup archives',
    status: 'INFO',
    details: `Populated ${SAMPLE_FILES.length} official college records across departments`,
    admin: 'System Initializer'
  });
}
