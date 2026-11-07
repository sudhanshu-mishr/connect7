import {AuthForm} from '@/components/auth-form';import {signIn} from '@/actions/auth';
export default function Login({searchParams}:{searchParams:{error?:string;message?:string}}){return <main className="grid min-h-screen place-items-center p-5"><AuthForm mode="login" action={signIn} error={searchParams.error} message={searchParams.message}/></main>}
