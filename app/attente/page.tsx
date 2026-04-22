'use client'
import { useRouter } from 'next/navigation'

export default function AttentePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col" style={{backgroundColor: '#2d4a3e'}}>
      <div className="flex flex-col items-center pt-12 pb-8">
        <img src="/logo.jpg.jpg" className="w-28 h-28 rounded-full mb-4 border-4 border-yellow-600" alt="logo" />
        <h1 className="text-white text-3xl font-serif">Madrassa Argenteuil</h1>
        <p className="text-yellow-400 text-xs tracking-widest mt-1">PORTAIL DE L'ÉTABLISSEMENT</p>
      </div>
      <div className="flex-1 bg-gray-50 rounded-t-3xl p-8 flex flex-col items-center justify-center">
        <div className="text-6xl mb-6">⏳</div>
        <h2 className="text-2xl font-bold text-gray-700 mb-4 text-center">Demande en cours</h2>
        <p className="text-gray-500 text-center mb-8">
          Votre inscription a bien été reçue. L'administrateur va valider votre compte sous peu.
        </p>
        <div className="w-full p-4 rounded-xl mb-8" style={{backgroundColor: '#e8f5f3'}}>
          <p className="text-center text-sm" style={{color: '#2d4a3e'}}>
            Vous recevrez une notification dès que votre compte sera activé.
          </p>
        </div>
        <button
          onClick={() => router.push('/login')}
          className="w-full py-4 rounded-full text-white font-bold"
          style={{backgroundColor: '#4a9b8e'}}
        >
          Retour à la connexion
        </button>
      </div>
    </div>
  )
}