import {AuthForm} from '@/components/auth-form';import {signUp} from '@/actions/auth';
export default function Register({searchParams}:{searchParams:{error?:string}}){return <main className="grid min-h-screen place-items-center p-5"><AuthForm mode="register" action={signUp} error={searchParams.error}/></main>}
