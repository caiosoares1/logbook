# Logbook

App de registro de treino (Upper/Lower + PPL) feito com Expo SDK 58.

## Rodar no celular com o Expo Go

Precisa de um computador com Node.js 20 ou mais novo.

```bash
npm install
npx expo start
```

Escaneie o QR code com o Expo Go (Android) ou com a câmera (iPhone).
O celular e o computador precisam estar na mesma rede Wi-Fi.
Se não conectar, use: `npx expo start --tunnel`

## Onde ficam os dados

Banco SQLite no próprio celular (expo-sqlite), funciona offline. Tabelas:

- `routines`: rotinas (Upper, Lower…), foco e dia da semana
- `exercises`: exercícios de cada rotina (nome, séries, reps, descanso, dica, ordem)
- `workouts`: treinos finalizados (data, duração, volume)
- `workout_sets`: cada série registrada (exercício, kg, reps)

Na primeira abertura o banco é criado e preenchido com a ficha inicial.
A aba **Ficha** faz o CRUD dos exercícios. O treino em andamento fica no AsyncStorage
para continuar de onde parou se o app for fechado.

## APK automático (GitHub Actions)

A cada push na branch `main`, o workflow `.github/workflows/android-apk.yml`
gera um APK e publica em **Releases** (`build-N`). Abra a release pelo celular,
baixe o `.apk` e instale (o Android vai pedir para permitir "instalar apps desconhecidos").
Também dá para rodar manualmente em **Actions → Gerar APK Android → Run workflow**.

O APK é assinado com a chave de debug, o que serve para uso pessoal.
Para publicar na Play Store é preciso uma chave de release própria.
