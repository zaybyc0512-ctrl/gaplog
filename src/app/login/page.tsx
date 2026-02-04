import { login, signup } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card'
import { GoogleSignInButton } from '@/components/google-sign-in-button'
import { Label } from '@/components/ui/label'

export default async function LoginPage(props: { searchParams: Promise<{ error?: string }> }) {
    const searchParams = await props.searchParams;
    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="text-2xl">GapLog</CardTitle>
                    <CardDescription>
                        Enter your email below to login or create account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {searchParams?.error && (
                        <div className="bg-destructive/10 text-destructive text-sm p-2 rounded mb-4">
                            {searchParams.error}
                        </div>
                    )}

                    <div className="grid gap-4 mb-4">
                        <GoogleSignInButton />
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                            </div>
                        </div>
                    </div>

                    <form className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" placeholder="m@example.com" required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" name="password" type="password" required />
                        </div>

                        <div className="flex flex-col gap-2 mt-2">
                            <Button formAction={login}>Sign In</Button>
                            <Button variant="outline" formAction={signup}>Sign Up</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
