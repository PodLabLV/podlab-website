import { redirect } from 'next/navigation';

export default function BottleneckAssessmentRedirect() {
  redirect('/assessment/start');
}
