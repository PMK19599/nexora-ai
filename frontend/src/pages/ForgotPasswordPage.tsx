import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function ForgotPasswordPage() {
  const [email,setEmail]=useState(''); const [message,setMessage]=useState(''); const [loading,setLoading]=useState(false);
  const submit=async(e:FormEvent)=>{e.preventDefault();setLoading(true);try{const{data}=await authAPI.forgotPassword(email.trim().toLowerCase());setMessage(data.message);}catch{setMessage('Unable to submit right now. Please try again.');}finally{setLoading(false);}};
  return <main id="main-content" className="auth-page"><Card className="auth-card"><CardHeader><h1 className="text-2xl font-bold">Reset your password</h1><p className="text-sm text-muted-foreground">Enter your email. We will send a link if an account exists.</p></CardHeader><CardContent><form onSubmit={submit} className="space-y-4"><div><Label htmlFor="reset-email">Email address</Label><Input id="reset-email" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} /></div><Button className="w-full" disabled={loading}>{loading?'Sending…':'Send reset link'}</Button><p role="status" aria-live="polite" className="text-sm">{message}</p><Link className="text-sm text-primary underline" to="/login">Back to sign in</Link></form></CardContent></Card></main>;
}
