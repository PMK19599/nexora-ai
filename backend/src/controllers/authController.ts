import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { User, Notification } from '../models';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { sendEmail } from '../services/emailService';
import { setCsrfCookie, CSRF_COOKIE } from '../middleware/csrf';

const SESSION_COOKIE = 'nexora_session';
const cookieBase = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none'|'lax', path: '/' });
const cookieOptions = () => ({ ...cookieBase(), maxAge: 60 * 60 * 1000 });
const hash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
const publicUser = (user: any) => { const value = user.toObject ? user.toObject() : { ...user }; delete value.password; delete value.tokenVersion; delete value.emailVerificationToken; delete value.passwordResetToken; return value; };
const frontendUrl = () => (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');

const createEmailToken = async (user: any, kind: 'verification'|'reset') => {
  const raw = crypto.randomBytes(32).toString('hex');
  if (kind === 'verification') { user.emailVerificationToken = hash(raw); user.emailVerificationExpires = new Date(Date.now() + 24*60*60*1000); user.verificationSentAt = new Date(); }
  else { user.passwordResetToken = hash(raw); user.passwordResetExpires = new Date(Date.now() + 60*60*1000); }
  await user.save({ validateBeforeSave: false });
  return raw;
};

const sendVerification = async (user: any) => {
  const token = await createEmailToken(user, 'verification');
  const url = frontendUrl() + '/verify-email?token=' + encodeURIComponent(token);
  await sendEmail({ to: user.email, subject: 'Verify your Nexora AI email', text: 'Verify your email: ' + url, html: '<p>Verify your email to unlock Nexora learning features.</p><p><a href="' + url + '">Verify email</a></p>' });
};

const sendSession = (user: any, code: number, res: Response) => {
  const token = user.getSignedJwtToken(); const csrfToken = setCsrfCookie(res);
  res.status(code).cookie(SESSION_COOKIE, token, cookieOptions()).json({ success: true, csrfToken, user: publicUser(user) });
};

const getDefaults = (type: string) => {
  const base = { fontSize:'medium',colorContrast:'normal',animations:true,readingMode:false,audioMode:false,focusMode:false,fontFamily:'default',lineSpacing:'normal',pomodoroEnabled:false,pomodoroWork:25,pomodoroBreak:5,reducedDistractions:false,predictableNavigation:false,ttsEnabled:false,ttsSpeed:1,reducedMotion:false,highContrast:false };
  if(type==='adhd' || type==='focus')return{...base,focusMode:true,pomodoroEnabled:true,pomodoroWork:15,reducedDistractions:true};
  if(type==='autism' || type==='predictable')return{...base,predictableNavigation:true,animations:false,reducedMotion:true,reducedDistractions:true};
  if(type==='dyslexia' || type==='reading')return{...base,fontFamily:'opendyslexic',lineSpacing:'extra',ttsEnabled:true,fontSize:'large',colorContrast:'high',highContrast:true};
  return base;
};

export const register = async (req: Request,res: Response,next: NextFunction):Promise<void>=>{try{
  const {name,password,learningTrack,neurodivergentType,timezone,communicationStyle}=req.body; const email=String(req.body.email).trim().toLowerCase();
  if(await User.findOne({email}))throw new AppError('Email already registered',400);
  const user=await User.create({name:String(name).trim(),email,password,learningTrack:learningTrack||'normal',neurodivergentType:neurodivergentType||'none',accessibility:getDefaults(neurodivergentType||'none'),timezone:timezone||'UTC',communicationStyle:communicationStyle||'text',isEmailVerified:false,onboardingComplete:false});
  await Notification.create({userId:user._id,type:'system',title:'Welcome to Nexora AI!',message:'Verify your email to begin your learning journey.'});
  try{await sendVerification(user);}catch(error: any){if(process.env.NODE_ENV==='production')console.error('📧 [EmailError]', { context: 'register_verification', provider: error.provider, status: error.status, code: error.providerCode, message: error.message });}
  sendSession(user,201,res);
}catch(e){next(e);}};

export const login = async(req:Request,res:Response,next:NextFunction):Promise<void>=>{try{const email=String(req.body.email).trim().toLowerCase();const user=await User.findOne({email}).select('+password +tokenVersion');if(!user||!(await user.comparePassword(req.body.password)))throw new AppError('Invalid credentials',401);user.lastActive=new Date();user.isOnline=true;await user.save();sendSession(user,200,res);}catch(e){next(e);}};
export const logout = async(req:AuthRequest,res:Response,next:NextFunction):Promise<void>=>{try{if(req.user)await User.findByIdAndUpdate(req.user._id,{$inc:{tokenVersion:1},isOnline:false,$unset:{socketId:1}});res.clearCookie(SESSION_COOKIE,cookieBase()).clearCookie(CSRF_COOKIE,{path:'/'}).status(200).json({success:true,message:'Logged out'});}catch(e){next(e);}};
export const getMe=async(req:AuthRequest,res:Response,next:NextFunction):Promise<void>=>{try{const csrfToken=setCsrfCookie(res);res.json({success:true,csrfToken,user:publicUser(req.user)});}catch(e){next(e);}};

export const forgotPassword=async(req:Request,res:Response,next:NextFunction):Promise<void>=>{try{const email=String(req.body.email||'').trim().toLowerCase();const user=await User.findOne({email}).select('+passwordResetToken +passwordResetExpires');if(user){const token=await createEmailToken(user,'reset');const url=frontendUrl()+'/reset-password?token='+encodeURIComponent(token);try{await sendEmail({to:user.email,subject:'Reset your Nexora AI password',text:'Reset your password: '+url,html:'<p><a href="'+url+'">Reset password</a>. This link expires in one hour.</p>'});}catch(error: any){if(process.env.NODE_ENV==='production')console.error('📧 [EmailError]', { context: 'password_reset', provider: error.provider, status: error.status, code: error.providerCode, message: error.message });}}res.json({success:true,message:'If an account exists for that email, a reset link has been sent.'});}catch(e){next(e);}};
export const resetPassword=async(req:Request,res:Response,next:NextFunction):Promise<void>=>{try{const user=await User.findOne({passwordResetToken:hash(String(req.body.token||'')),passwordResetExpires:{$gt:new Date()}}).select('+password +passwordResetToken +passwordResetExpires +tokenVersion');if(!user)throw new AppError('This reset link is invalid or has expired.',400);user.password=req.body.password;user.passwordResetToken=undefined;user.passwordResetExpires=undefined;user.tokenVersion=(user.tokenVersion||0)+1;await user.save();res.clearCookie(SESSION_COOKIE,cookieBase());res.json({success:true,message:'Password reset. Please sign in with your new password.'});}catch(e){next(e);}};
export const verifyEmail=async(req:Request,res:Response,next:NextFunction):Promise<void>=>{try{const user=await User.findOne({emailVerificationToken:hash(String(req.body.token||'')),emailVerificationExpires:{$gt:new Date()}}).select('+emailVerificationToken +emailVerificationExpires');if(!user)throw new AppError('This verification link is invalid or has expired.',400);user.isEmailVerified=true;user.emailVerificationToken=undefined;user.emailVerificationExpires=undefined;await user.save({validateBeforeSave:false});res.json({success:true,message:'Email verified successfully.'});}catch(e){next(e);}};
export const resendVerification=async(req:Request,res:Response,next:NextFunction):Promise<void>=>{try{const email=String(req.body.email||'').trim().toLowerCase();const user=await User.findOne({email,isEmailVerified:false}).select('+emailVerificationToken +emailVerificationExpires +verificationSentAt');if(user&&(!user.verificationSentAt||Date.now()-user.verificationSentAt.getTime()>60000)){try{await sendVerification(user);}catch(error: any){if(process.env.NODE_ENV==='production')console.error('📧 [EmailError]', { context: 'resend_verification', provider: error.provider, status: error.status, code: error.providerCode, message: error.message });}}res.json({success:true,message:'If the account needs verification, a new email has been sent.'});}catch(e){next(e);}};

export const updateProfile=async(req:AuthRequest,res:Response,next:NextFunction):Promise<void>=>{try{const fields=['name','avatar','learningTrack','neurodivergentType','skills','interests','timezone','communicationStyle','accessibility','onboardingComplete'];const updates:any={};for(const f of fields)if(req.body[f]!==undefined)updates[f]=req.body[f];if(updates.neurodivergentType&&updates.neurodivergentType!==req.user?.neurodivergentType)updates.accessibility={...(req.user?.accessibility||{}),...getDefaults(updates.neurodivergentType),...(updates.accessibility||{})};const user=await User.findByIdAndUpdate(req.user?._id,updates,{new:true,runValidators:true});res.json({success:true,user});}catch(e){next(e);}};
export const getNotifications=async(req:AuthRequest,res:Response,next:NextFunction):Promise<void>=>{try{res.json({success:true,notifications:await Notification.find({userId:req.user?._id}).sort({createdAt:-1}).limit(50)});}catch(e){next(e);}};
export const markNotificationRead=async(req:AuthRequest,res:Response,next:NextFunction):Promise<void>=>{try{if(req.params.id==='all')await Notification.updateMany({userId:req.user?._id,read:false},{read:true});else await Notification.findOneAndUpdate({_id:req.params.id,userId:req.user?._id},{read:true});res.json({success:true});}catch(e){next(e);}};
export const unlockReward=async(req:AuthRequest,res:Response,next:NextFunction):Promise<void>=>{try{const{rewardId,xpCost}=req.body;const user=await User.findById(req.user?._id);if(!user)throw new AppError('User not found',404);if(!Number.isFinite(xpCost)||xpCost<0)throw new AppError('Invalid reward cost',400);if((user.xp||0)<xpCost)throw new AppError('Insufficient XP',400);if(user.unlockedRewards?.includes(rewardId))throw new AppError('Reward already unlocked',400);user.xp=(user.xp||0)-xpCost;user.unlockedRewards=[...(user.unlockedRewards||[]),rewardId];await user.save();res.json({success:true,user:publicUser(user),message:'Reward successfully unlocked!'});}catch(e){next(e);}};
