***
      PROGRAM fixture
c-------------------------------------------------------------c
c
c     Test fixtures for The Clockwork Sky's port of SSE.
c
c     Reads lines of "mass z tphysf" from standard input and, for
c     each, evolves one star from the ZAMS with Hurley's own
c     EVOLV1 and the default switches of evolve.in, printing every
c     step at full precision:
c
c       S j tphys kw mass mt lum r mc rc menv renv epoch
c
c     followed by the type changes from the SPP log:
c
c       P tphys kw mt
c
c     and a line "E" at the end of the star. Only the output is
c     new; SSE itself is unchanged, except that SCM and SPP are
c     stored as REAL*8 so that nothing is rounded to single
c     precision on the way out (build-fixtures.ts patches that).
c
c-------------------------------------------------------------c
      implicit none
*
      INCLUDE 'const_bse.h'
*
      integer kw,j,k,ios
      real*8 mass,mt,z,zpars(20)
      real*8 epoch,tms,tphys,tphysf,dtp
      real*8 r,lum,ospin
      real*8 mc,rc,menv,renv
*
* The defaults of evolve.in.
*
      neta = 0.5d0
      bwind = 0.d0
      hewind = 0.5d0
      sigma = 190.d0
      ifflag = 0
      wdflag = 1
      bhflag = 0
      nsflag = 1
      mxns = 3.d0
      pts1 = 0.05d0
      pts2 = 0.01d0
      pts3 = 0.02d0
      idum = -1
*
 10   READ(*,*,iostat=ios)mass,z,tphysf
      if(ios.ne.0) goto 99
      CALL zcnsts(z,zpars)
      mt = mass
      kw = 1
      tphys = 0.d0
      epoch = 0.d0
      ospin = 0.d0
      dtp = 0.d0
      CALL evolv1(kw,mass,mt,r,lum,mc,rc,menv,renv,ospin,
     &            epoch,tms,tphys,tphysf,dtp,z,zpars)
      j = 0
 20   j = j + 1
      if(scm(j,1).ge.0.d0)then
         WRITE(*,100)j,scm(j,1),INT(scm(j,2)),(scm(j,k),k=3,4),
     &               10.d0**scm(j,5),10.d0**scm(j,6),(scm(j,k),k=8,12)
         goto 20
      endif
      j = 0
 30   j = j + 1
      if(spp(j,1).ge.0.d0)then
         WRITE(*,101)spp(j,1),INT(spp(j,2)),spp(j,3)
         goto 30
      endif
      WRITE(*,'(a)')'E'
      goto 10
 99   continue
 100  FORMAT('S ',i6,1p,e24.16,i4,9e24.16)
 101  FORMAT('P ',1p,e24.16,i4,e24.16)
      STOP
      END
***
